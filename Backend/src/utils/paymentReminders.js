import { Op } from "sequelize";
import { PaymentDetails, Payment } from "../models/index.js";
import { isMembershipPaid, remainingMembershipBalance } from "./membershipPayments.js";

export function isReminderOpen(details, membership) {
  if (details.resolvedAt) return false;
  if (!membership) return true;
  return remainingMembershipBalance(membership.totalAmount, membership.Payments ?? []) > 0;
}

// Resolves reminders when a membership is fully paid; reopens auto-resolved ones if a void brings a balance back.
export async function syncMembershipReminders(membership, payments, transaction, { DetailsModel = PaymentDetails, PaymentModel = Payment } = {}) {
  const paymentIds = (await PaymentModel.findAll({
    where: { membershipId: membership.id },
    attributes: ["id"],
    transaction,
  })).map((payment) => payment.id);
  if (!paymentIds.length) return;
  const paid = isMembershipPaid(membership.totalAmount, payments);
  await DetailsModel.update(
    { resolvedAt: paid ? new Date() : null },
    { where: { paymentId: paymentIds, resolvedAt: paid ? null : { [Op.ne]: null } }, transaction },
  );
}
