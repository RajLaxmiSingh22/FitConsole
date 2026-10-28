import { addDaysToDateString } from "./dates.js";
import { addMembershipMonths } from "./membershipDates.js";

export function getRenewalDates({ oldEndDate, durationMonths, today }) {
  const startDate = oldEndDate >= today ? addDaysToDateString(oldEndDate, 1) : today;
  return {
    startDate,
    endDate: addMembershipMonths(startDate, durationMonths),
  };
}

export function hasLaterActiveMembership(memberships, previousMembership, today) {
  return memberships.some((membership) =>
    membership.clientId === previousMembership.clientId
    && membership.courseId === previousMembership.courseId
    && membership.status === "active"
    && membership.endDate >= today
    && membership.startDate > previousMembership.startDate
  );
}
