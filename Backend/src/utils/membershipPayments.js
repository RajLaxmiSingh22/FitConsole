export function toMinorUnits(amount) {
  return Math.round(Number(amount || 0) * 100);
}

export function totalNonVoidedPayments(payments = []) {
  const total = payments.reduce((sum, payment) =>
    payment.voidedAt ? sum : sum + toMinorUnits(payment.amount), 0);
  return total / 100;
}

export function remainingMembershipBalance(totalAmount, payments = []) {
  return Math.max(0, toMinorUnits(totalAmount) - toMinorUnits(totalNonVoidedPayments(payments))) / 100;
}

export function isMembershipPaid(totalAmount, payments) {
  return toMinorUnits(totalNonVoidedPayments(payments)) >= toMinorUnits(totalAmount);
}

export function membershipStatusForBalance(totalAmount, payments, currentStatus = "pending_payment") {
  if (currentStatus === "cancelled" || currentStatus === "expired") return currentStatus;
  return isMembershipPaid(totalAmount, payments) ? "active" : "pending_payment";
}

export function isMembershipValidOnDate(membership, date) {
  return membership?.status === "active"
    && membership.startDate <= date
    && membership.endDate >= date;
}
