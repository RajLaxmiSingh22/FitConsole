export function addMembershipMonths(startDate, months) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const targetMonth = start.getUTCMonth() + months;
  const targetYear = start.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const targetLastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(start.getUTCDate(), targetLastDay);
  return new Date(Date.UTC(targetYear, normalizedMonth, targetDay - 1)).toISOString().slice(0, 10);
}

export function getMembershipDurationMonths(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return Math.max(1, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth());
}
