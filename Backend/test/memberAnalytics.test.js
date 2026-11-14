import assert from "node:assert/strict";
import test from "node:test";
import { attendanceSeries, buildInsights, latestRecords, loadAttendanceContext } from "../src/services/memberAnalytics.js";
import { memberAnalyticsQuerySchema, memberCalendarQuerySchema, trainerNoteSchema, wellnessCheckinSchema } from "../src/validation/index.js";

test("insights appear only when there is enough recorded data", () => {
  const summary = { scheduledSessions: 16, attendedScheduled: 12 };
  const weekdays = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09"];
  const wellness = [
    ...[8, 7.5, 7].map((sleepHours) => ({ sleepHours, energy: 4 })),
    ...[5, 6, 5.5].map((sleepHours) => ({ sleepHours, energy: 2 })),
  ];
  const insights = buildInsights({ summary, visits: weekdays, previousMonthVisits: 12, thisMonthVisits: 6, wellness, weights: [{ value: 75 }, { value: 76.4 }] });
  assert.ok(insights.includes("You attended 12 of 16 scheduled sessions in this period."));
  assert.ok(insights.includes("Your attendance is strongest on weekdays."));
  assert.ok(insights.includes("You visited 6 times in the last 30 days, down from 12 in the 30 days before."));
  assert.ok(insights.some((text) => text.startsWith("Your energy was higher on days after 7+ hours of sleep")));
  assert.ok(insights.includes("Your recorded weight changed by +1.4 kg over this period."));
  assert.deepEqual(buildInsights({ summary: { scheduledSessions: 2, attendedScheduled: 2 }, visits: [], previousMonthVisits: 0, thisMonthVisits: 0, wellness: [], weights: [] }), []);
});

test("latest records are sorted newest first and name their source", () => {
  const records = latestRecords({
    visits: [{ attendedAt: "2026-11-05T12:30:00Z", checkedOutAt: "2026-11-05T13:45:00Z", trainerId: "t1", Course: { name: "MMA" } }],
    progress: [{ recordedAt: "2026-11-04T15:00:00Z", weightKg: 76.4, stamina: 8, staminaNotes: "Deadlift 115 kg", waistCm: 81 }],
    wellness: [{ updatedAt: "2026-11-06T02:00:00Z", mood: "happy", energy: 4, pain: false }],
    notes: [{ kind: "recommendation", body: "Add a fourth day", createdAt: "2026-11-03T10:00:00Z" }],
    dietEntries: [],
  });
  assert.deepEqual(records.map((record) => record.type), ["Wellness", "Check-out", "Check-in", "Workout", "Weight", "Measurements", "Recommendation"]);
  assert.equal(records.find((record) => record.type === "Check-in").source, "trainer");
  assert.equal(records.find((record) => record.type === "Measurements").detail, "Waist 81 cm");
});

test("weekly and monthly series count visits against scheduled days", () => {
  const entry = { attendedDates: ["2026-11-02", "2026-11-04"], isScheduled: (date) => ["2026-11-02", "2026-11-04", "2026-11-06"].includes(date) };
  const { weekly, monthly } = attendanceSeries(entry, { today: "2026-11-08", rangeDays: 7 });
  const week = weekly.find((row) => row.week === "2026-11-02");
  assert.deepEqual([week.visits, week.scheduled, week.rate], [2, 3, 67]);
  assert.deepEqual(monthly.map((row) => [row.month, row.visits]), [["2026-11", 2]]);
});

test("attendance context batches members, dedupes days and uses each member's training days", async () => {
  const calls = [];
  const models = {
    Attendance: { findAll: async () => { calls.push("attendance"); return [
      { clientId: "a", attendedOn: "2026-11-02" }, { clientId: "a", attendedOn: "2026-11-02" }, { clientId: "b", attendedOn: "2026-11-03" },
    ]; } },
    Membership: { findAll: async () => { calls.push("memberships"); return [
      { clientId: "a", courseId: "c1", startDate: "2026-11-01", endDate: "2026-11-30", status: "active" },
      { clientId: "b", courseId: "c2", startDate: "2026-11-01", endDate: "2026-11-30", status: "active" },
    ]; } },
  };
  const context = await loadAttendanceContext([{ userId: "a", trainingDays: [2, 4] }, { userId: "b", trainingDays: null }], { models });
  assert.equal(calls.length, 2);
  assert.deepEqual(context.get("a").attendedDates, ["2026-11-02"]);
  assert.equal(context.get("a").isScheduled("2026-11-03"), true);
  assert.equal(context.get("a").isScheduled("2026-11-02"), false);
  // No personal plan: Mon / Wed / Fri.
  assert.deepEqual(context.get("b").trainingDays, [1, 3, 5]);
  assert.equal(context.get("b").isScheduled("2026-11-04"), true);
  assert.equal(context.get("b").isScheduled("2026-11-07"), false);
  // Outside the membership nothing is scheduled.
  assert.equal(context.get("b").isScheduled("2026-12-02"), false);
});

test("analytics inputs are validated", () => {
  assert.equal(memberAnalyticsQuerySchema.validate({}).value.range, 30);
  assert.ok(memberAnalyticsQuerySchema.validate({ range: 45 }).error);
  assert.ok(memberCalendarQuerySchema.validate({ month: "2026-13" }).error);
  assert.ok(wellnessCheckinSchema.validate({ mood: "angry", energy: 3, stress: 3, motivation: 3, soreness: 3 }).error);
  assert.ok(wellnessCheckinSchema.validate({ mood: "happy", energy: 6, stress: 3, motivation: 3, soreness: 3 }).error);
  assert.ok(trainerNoteSchema.validate({ kind: "secret", body: "x" }).error);
});

test("course age limits are enforced from the member's date of birth", async () => {
  const { courseAgeError } = await import("../src/utils/courseEligibility.js");
  const kids = { name: "Kids Martial Arts", minAge: 6, maxAge: 12 };
  assert.equal(courseAgeError(kids, { dateOfBirth: "2017-03-01" }, "2026-11-07"), null);
  assert.match(courseAgeError(kids, { dateOfBirth: "2000-03-01" }, "2026-11-07"), /ages 6–12; this member is 26/);
  assert.match(courseAgeError(kids, { dateOfBirth: null }, "2026-11-07"), /date of birth/);
  assert.equal(courseAgeError({ name: "Open", minAge: null, maxAge: null }, {}, "2026-11-07"), null);
});

test("2-month plans are allowed", async () => {
  const { createMembershipSchema } = await import("../src/validation/index.js");
  const value = { clientId: "1b4e28ba-2fa1-4d2a-883f-0016d3cca427", courseId: "1b4e28ba-2fa1-4d2a-883f-0016d3cca427", durationMonths: 2 };
  assert.equal(createMembershipSchema.validate(value).error, undefined);
  assert.ok(createMembershipSchema.validate({ ...value, durationMonths: 4 }).error);
});
