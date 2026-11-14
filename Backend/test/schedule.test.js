import assert from "node:assert/strict";
import test from "node:test";
import { serializeSession, sessionsOverlap } from "../src/controllers/scheduleController.js";
import { createClassSessionSchema, updateClassSessionSchema } from "../src/validation/index.js";

const courseId = "1b4e28ba-2fa1-4d2a-883f-0016d3cca427";

test("class slots need a course, ISO weekday and an end after the start", () => {
  assert.equal(createClassSessionSchema.validate({ courseId, weekday: 1, startTime: "06:00", endTime: "07:00" }).error, undefined);
  assert.match(createClassSessionSchema.validate({ courseId, weekday: 1, startTime: "07:00", endTime: "07:00" }).error.message, /after/);
  assert.ok(createClassSessionSchema.validate({ courseId, weekday: 8, startTime: "06:00", endTime: "07:00" }).error);
  assert.ok(createClassSessionSchema.validate({ courseId, weekday: 1, startTime: "6am", endTime: "07:00" }).error);
  assert.ok(updateClassSessionSchema.validate({}).error);
  assert.match(updateClassSessionSchema.validate({ startTime: "19:00", endTime: "18:00" }).error.message, /after/);
});

test("overlap only counts same-day slots that intersect; back-to-back is fine", () => {
  const base = { weekday: 2, startTime: "18:00", endTime: "19:00" };
  assert.equal(sessionsOverlap(base, { weekday: 2, startTime: "18:30", endTime: "19:30" }), true);
  assert.equal(sessionsOverlap(base, { weekday: 2, startTime: "19:00", endTime: "20:00" }), false);
  assert.equal(sessionsOverlap(base, { weekday: 3, startTime: "18:00", endTime: "19:00" }), false);
});

test("public session shape exposes only the trainer's name and HH:MM times", () => {
  const shaped = serializeSession({
    id: "s1", weekday: 1, startTime: "06:30:00", endTime: "07:30:00", level: "", active: true,
    Course: { id: courseId, name: "MMA", category: "Combat" },
    Trainer: { userId: "t1", User: { fullName: "Asha Rao", email: "private@example.com" } },
  });
  assert.deepEqual(shaped, {
    id: "s1", weekday: 1, startTime: "06:30", endTime: "07:30", level: null, active: true,
    course: { id: courseId, name: "MMA", category: "Combat" },
    trainer: { id: "t1", name: "Asha Rao" },
  });
});
