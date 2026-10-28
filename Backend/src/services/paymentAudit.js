import { PaymentAudit } from "../models/index.js";

export function writePaymentAudit({
  paymentId,
  userId,
  action,
  oldValues = null,
  newValues = null,
  transaction,
  AuditModel = PaymentAudit,
}) {
  return AuditModel.create({
    paymentId,
    userId,
    action,
    oldValues,
    newValues,
  }, { transaction });
}
