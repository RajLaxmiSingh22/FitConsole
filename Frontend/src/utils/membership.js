// Display helpers for member-facing membership and pricing screens; the server remains the source of truth.

export function paidAmount(membership) {
  return (membership.Payments ?? []).reduce((sum, payment) => sum + (payment.voidedAt ? 0 : Number(payment.amount || 0)), 0);
}

export function dueAmount(membership) {
  return Math.max(0, Number((Number(membership.totalAmount) - paidAmount(membership)).toFixed(2)));
}

export function isOpenMembership(membership) {
  return ["active", "pending_payment"].includes(membership.status);
}

// Whole days from today (IST) until a YYYY-MM-DD end date; negative once it has passed.
export function daysUntil(endDate, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

// Share of the membership period already used, 0–100.
export function periodProgress(startDate, endDate, now = new Date()) {
  const total = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  if (!(total > 0)) return 100;
  const used = total - daysUntil(endDate, now) * 86400000;
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

export function durationLabel(months) {
  return `${months} ${Number(months) === 1 ? "month" : "months"}`;
}

// Sorts a course's plans and adds per-month price, saving against the shortest plan, and the best-value flag.
export function pricedPlans(plans = []) {
  const sorted = plans.slice().sort((left, right) => Number(left.durationMonths) - Number(right.durationMonths));
  if (!sorted.length) return [];
  const base = sorted[0];
  const baseMonthly = Number(base.price) / Number(base.durationMonths);
  const rows = sorted.map((plan) => {
    const monthly = Number(plan.price) / Number(plan.durationMonths);
    const savingPercent = baseMonthly > 0 ? Math.round((1 - monthly / baseMonthly) * 100) : 0;
    return { ...plan, monthly, savingPercent: savingPercent > 0 ? savingPercent : 0 };
  });
  const best = rows.reduce((winner, row) => (row.monthly < winner.monthly ? row : winner), rows[0]);
  return rows.map((row) => ({ ...row, bestValue: rows.length > 1 && row === best && row.savingPercent > 0 }));
}
