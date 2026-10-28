import assert from "node:assert/strict";
import test from "node:test";
import { addDaysToDateString, dayRangeInGymTz, startOfMonthInGymTz, todayInGymTz } from "../src/utils/dates.js";

test("today rolls over at IST midnight, not UTC midnight", () => {
  assert.equal(todayInGymTz(new Date("2026-10-27T23:30:00Z"), "Asia/Kolkata"), "2026-10-28");
  assert.equal(todayInGymTz(new Date("2026-10-27T18:29:00Z"), "Asia/Kolkata"), "2026-10-27");
});

test("month start is IST midnight on the 1st", () => {
  assert.equal(
    startOfMonthInGymTz(new Date("2026-10-31T19:00:00Z"), "Asia/Kolkata").toISOString(),
    "2026-10-31T18:30:00.000Z",
  );
});

test("day range covers one IST day", () => {
  const { start, end } = dayRangeInGymTz("2026-10-28", "Asia/Kolkata");
  assert.equal(start.toISOString(), "2026-10-27T18:30:00.000Z");
  assert.equal(end.toISOString(), "2026-10-28T18:30:00.000Z");
});

test("date-string arithmetic crosses month and year boundaries", () => {
  assert.equal(addDaysToDateString("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysToDateString("2026-03-01", -1), "2026-02-28");
});
