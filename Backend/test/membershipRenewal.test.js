import assert from "node:assert/strict";
import test from "node:test";
import { renewMembershipSchema } from "../src/validation/membership.validation.js";
import { getRenewalDates, hasLaterActiveMembership } from "../src/utils/membershipRenewal.js";

test("renewal dates begin after an unexpired membership and use the selected duration", () => {
  assert.deepEqual(getRenewalDates({
    oldEndDate: "2026-10-25",
    durationMonths: 3,
    today: "2026-10-20",
  }), {
    startDate: "2026-10-26",
    endDate: "2027-01-25",
  });
});

test("renewal dates begin today when the previous membership has expired", () => {
  assert.deepEqual(getRenewalDates({
    oldEndDate: "2026-10-19",
    durationMonths: 1,
    today: "2026-10-20",
  }), {
    startDate: "2026-10-20",
    endDate: "2026-11-19",
  });
});

test("duplicate renewal detection requires a later unexpired active membership for same client and course", () => {
  const previous = {
    clientId: "client-id",
    courseId: "course-id",
    startDate: "2026-01-01",
  };
  const laterMembership = {
    ...previous,
    startDate: "2026-02-01",
    endDate: "2026-12-01",
    status: "active",
  };

  assert.equal(hasLaterActiveMembership([laterMembership], previous, "2026-10-20"), true);
  assert.equal(hasLaterActiveMembership([
    { ...laterMembership, status: "cancelled" },
  ], previous, "2026-10-20"), false);
  assert.equal(hasLaterActiveMembership([
    { ...laterMembership, endDate: "2026-10-19" },
  ], previous, "2026-10-20"), false);
  assert.equal(hasLaterActiveMembership([
    { ...laterMembership, clientId: "another-client" },
  ], previous, "2026-10-20"), false);
});

test("renewal body accepts an optional supported duration only", () => {
  assert.equal(renewMembershipSchema.validate({}).error, undefined);
  assert.equal(renewMembershipSchema.validate({ durationMonths: 6 }).error, undefined);
  assert.ok(renewMembershipSchema.validate({ durationMonths: 2 }).error);
});
