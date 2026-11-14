import assert from "node:assert/strict";
import test from "node:test";
import { buildSchedule, computeAttendanceStats, isoWeekday, monthCalendar, weekStrip } from "../src/utils/attendanceStats.js";

// November 2026: Mon 2, Wed 4, Fri 6, Mon 9, Wed 11, Fri 13 ...
const monWedFri = buildSchedule({ periods: [{ start: "2026-11-01", end: "2026-12-31" }], weekdays: new Set([1, 3, 5]) });

test("ISO weekdays: Monday is 1 and Sunday is 7", () => {
  assert.equal(isoWeekday("2026-11-02"), 1);
  assert.equal(isoWeekday("2026-11-08"), 7);
});

test("rest days neither extend nor break a streak", () => {
  const stats = computeAttendanceStats({ attendedDates: ["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09"], isScheduled: monWedFri, today: "2026-11-10" });
  assert.equal(stats.currentStreak, 4);
  assert.equal(stats.longestStreak, 4);
  assert.equal(stats.missedSessions, 0);
  assert.equal(stats.attendancePercentage, 100);
});

test("a missed scheduled session resets the current streak but keeps the longest", () => {
  const stats = computeAttendanceStats({ attendedDates: ["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-11", "2026-11-13"], isScheduled: monWedFri, today: "2026-11-14" });
  assert.equal(stats.longestStreak, 3);
  assert.equal(stats.currentStreak, 2);
  assert.deepEqual(stats.missedDates, ["2026-11-09"]);
  assert.equal(stats.attendancePercentage, 83);
});

test("today's scheduled session does not reset the streak before the member arrives", () => {
  const stats = computeAttendanceStats({ attendedDates: ["2026-11-02", "2026-11-04"], isScheduled: monWedFri, today: "2026-11-06" });
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.missedSessions, 0);
});

test("duplicate check-ins on one day count as one visit", () => {
  const stats = computeAttendanceStats({ attendedDates: ["2026-11-02", "2026-11-02", "2026-11-04"], isScheduled: monWedFri, today: "2026-11-05" });
  assert.equal(stats.totalVisits, 2);
  assert.equal(stats.currentStreak, 2);
});

test("an extra visit on a rest day counts as a visit and extends the streak without affecting the percentage", () => {
  const stats = computeAttendanceStats({ attendedDates: ["2026-11-02", "2026-11-03", "2026-11-04"], isScheduled: monWedFri, today: "2026-11-05" });
  assert.equal(stats.totalVisits, 3);
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.scheduledSessions, 2);
  assert.equal(stats.attendancePercentage, 100);
});

test("closed days and days outside membership are not missed sessions", () => {
  const schedule = buildSchedule({ periods: [{ start: "2026-11-04", end: "2026-11-30" }], weekdays: new Set([1, 3, 5]), closedDates: new Set(["2026-11-06"]) });
  const stats = computeAttendanceStats({ attendedDates: ["2026-11-04", "2026-11-09"], isScheduled: schedule, today: "2026-11-10", from: "2026-11-01" });
  assert.equal(stats.missedSessions, 0);
  assert.equal(stats.currentStreak, 2);
});

test("future check-ins are ignored and an empty history has no percentage", () => {
  assert.equal(computeAttendanceStats({ attendedDates: ["2026-11-20"], isScheduled: monWedFri, today: "2026-11-10" }).totalVisits, 0);
  assert.equal(computeAttendanceStats({ attendedDates: [], isScheduled: () => false, today: "2026-11-10" }).attendancePercentage, null);
});

test("week strip marks attended, missed, pending, upcoming and rest days with today highlighted", () => {
  const week = weekStrip({ attendedDates: ["2026-11-09"], isScheduled: monWedFri, today: "2026-11-13" });
  assert.deepEqual(week.map((day) => day.status), ["attended", "rest", "missed", "rest", "pending", "rest", "rest"]);
  assert.equal(week.find((day) => day.isToday).date, "2026-11-13");
  const nextWeek = weekStrip({ attendedDates: [], isScheduled: monWedFri, today: "2026-11-16" });
  assert.equal(nextWeek[2].status, "upcoming");
});

test("month calendar covers every day of the month", () => {
  const days = monthCalendar({ month: "2026-02", attendedDates: ["2026-02-02"], isScheduled: monWedFri, today: "2026-11-01" });
  assert.equal(days.length, 28);
  assert.equal(days[1].status, "attended");
});
