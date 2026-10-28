import { Op } from "sequelize";
import { Membership } from "../models/index.js";

export async function getExistingPendingMembership(
  clientId,
  transaction,
  { MembershipModel = Membership, now = new Date() } = {},
) {
  await MembershipModel.sequelize.query(
    "SELECT pg_advisory_xact_lock(hashtext(:key))",
    { replacements: { key: `membership-pending:${clientId}` }, transaction },
  );
  await MembershipModel.update(
    { status: "cancelled" },
    {
      where: {
        clientId,
        status: "pending_payment",
        createdAt: { [Op.lt]: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      },
      transaction,
    },
  );
  return MembershipModel.findOne({
    where: { clientId, status: "pending_payment" },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}
