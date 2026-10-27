import assert from "node:assert/strict";
import test from "node:test";
import { addMembershipMonths, getMembershipDurationMonths } from "../src/utils/membershipDates.js";

test("membership duration ends the day before its calendar anniversary", () => {
  assert.equal(addMembershipMonths("2026-10-25", 1), "2026-11-24");
  assert.equal(addMembershipMonths("2026-10-25", 3), "2027-01-24");
  assert.equal(addMembershipMonths("2026-10-25", 6), "2027-04-24");
  assert.equal(addMembershipMonths("2026-10-25", 12), "2027-10-24");
});

test("membership dates handle shorter months and leap years", () => {
  assert.equal(addMembershipMonths("2027-01-31", 1), "2027-02-27");
  assert.equal(addMembershipMonths("2028-01-31", 1), "2028-02-28");
});

test("renewal retains the selected membership duration", () => {
  for (const months of [1, 3, 6, 12]) {
    const startDate = "2026-10-25";
    const endDate = addMembershipMonths(startDate, months);
    assert.equal(getMembershipDurationMonths(startDate, endDate), months);
  }
});
