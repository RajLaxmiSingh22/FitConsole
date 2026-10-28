import { CashfreeOrder, Membership, Payment, PaymentAudit, PaymentDetails } from "../models/index.js";
import { sequelize } from "../database.js";
import { getCashfreePaymentMethod } from "./cashfree.js";
import { writePaymentAudit } from "./paymentAudit.js";
import { toMinorUnits } from "../utils/membershipPayments.js";
import { syncMembershipReminders } from "../utils/paymentReminders.js";

const defaultDependencies = {
  sequelize,
  CashfreeOrder,
  Membership,
  Payment,
  PaymentAudit,
  PaymentDetails,
  syncReminders: syncMembershipReminders,
};

export async function recordCashfreeSuccess(order, providerPayment, dependencies = defaultDependencies) {
  const {
    sequelize: database,
    CashfreeOrder: Order,
    Membership: MembershipModel,
    Payment: PaymentModel,
    PaymentAudit: PaymentAuditModel,
    PaymentDetails: PaymentDetailsModel,
    syncReminders,
  } = dependencies;
  const paymentMethod = getCashfreePaymentMethod(providerPayment.payment_group);
  const paidAmount = Number(providerPayment.payment_amount ?? providerPayment.order_amount);
  if (
    providerPayment.payment_status !== "SUCCESS"
    || providerPayment.order_id !== order.cashfreeOrderId
    || (providerPayment.payment_currency && providerPayment.payment_currency !== "INR")
    || !Number.isFinite(paidAmount)
    || paidAmount !== Number(order.amount)
    || !paymentMethod
  ) {
    throw new Error("Cashfree payment details could not be verified.");
  }

  return database.transaction(async (transaction) => {
    const lockedOrder = await Order.findByPk(order.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedOrder) throw new Error("Cashfree order no longer exists.");
    if (lockedOrder.status === "success" && lockedOrder.paymentId) {
      const existingPayment = await PaymentModel.findByPk(lockedOrder.paymentId, { transaction });
      if (!existingPayment) throw new Error("Recorded Cashfree payment could not be found.");
      return existingPayment;
    }

    let needsReview = false;
    let membership;
    let previouslyPaid = 0;
    if (lockedOrder.membershipId) {
      membership = await MembershipModel.findByPk(lockedOrder.membershipId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!membership) throw new Error("Cashfree membership could not be found.");
      previouslyPaid = Number(await PaymentModel.sum("amount", {
        where: { membershipId: membership.id, voidedAt: null },
        transaction,
      }) ?? 0);
      needsReview = toMinorUnits(previouslyPaid) + toMinorUnits(lockedOrder.amount) > toMinorUnits(membership.totalAmount);
      if (needsReview) {
        console.warn("Cashfree payment exceeds the current membership balance and needs refund review.", {
          orderId: lockedOrder.cashfreeOrderId,
          membershipId: membership.id,
          amount: Number(lockedOrder.amount),
          previouslyPaid,
          membershipTotal: Number(membership.totalAmount),
        });
      }
    }

    const completedAt = providerPayment.payment_completion_time ?? providerPayment.payment_time;
    const dateTime = completedAt && !Number.isNaN(Date.parse(completedAt))
      ? new Date(completedAt)
      : new Date();
    const recordedPayment = await PaymentModel.create({
      membershipId: lockedOrder.membershipId,
      amount: lockedOrder.amount,
      paymentMethod,
      reference: `Cashfree ${lockedOrder.cashfreeOrderId} (${providerPayment.cf_payment_id ?? "payment"})`,
      dateTime,
      needsReview,
    }, { transaction });
    await PaymentDetailsModel.create({
      paymentId: recordedPayment.id,
      clientId: lockedOrder.clientId,
      reminderDate: lockedOrder.reminderDate,
    }, { transaction });
    await writePaymentAudit({
      paymentId: recordedPayment.id,
      userId: lockedOrder.createdById,
      action: "create",
      newValues: recordedPayment.toJSON(),
      transaction,
      AuditModel: PaymentAuditModel,
    });
    await lockedOrder.update({
      status: "success",
      paymentId: recordedPayment.id,
    }, { transaction });
    if (
      membership?.status === "pending_payment"
      && !needsReview
      && toMinorUnits(previouslyPaid) + toMinorUnits(lockedOrder.amount) >= toMinorUnits(membership.totalAmount)
    ) {
      await membership.update({ status: "active" }, { transaction });
    }
    if (membership && syncReminders) {
      const payments = await PaymentModel.findAll({
        where: { membershipId: membership.id, voidedAt: null },
        attributes: ["amount"],
        transaction,
      });
      await syncReminders(membership, payments, transaction);
    }
    return recordedPayment;
  });
}
