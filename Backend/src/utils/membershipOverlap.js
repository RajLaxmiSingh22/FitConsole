export function membershipPeriodsOverlap(a, b) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}
