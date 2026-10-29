import cron from "node-cron";
import { Op, QueryTypes } from "sequelize";
import { pruneExpiredRefreshTokens } from "../auth.js";
import { sequelize } from "../database.js";
import { CashfreeOrder, Membership } from "../models/index.js";
import { getCashfreeClient, getCashfreePaymentStatus } from "../services/cashfree.js";
import { recordCashfreeSuccess } from "../services/cashfreePayment.js";
import { todayInGymTz } from "../utils/dates.js";

const DAILY_JOB_LOCK_KEY = "fitconsole:daily-job";
const PENDING_PAYMENT_TTL_MS = 48 * 60 * 60 * 1000;

// Decides what to do with a pending order whose checkout window has passed.
export function staleOrderAction(providerPayments) {
  const status = getCashfreePaymentStatus(providerPayments);
  if (status === "success") return "record";
  // An expired order with no attempts can no longer be paid; a PENDING attempt may still settle.
  if (status === "failed" || !providerPayments.length) return "fail";
  return "keep";
}

export async function runDailyJob({
  MembershipModel = Membership,
  OrderModel = CashfreeOrder,
  fetchPayments = async (orderId) => {
    const response = await getCashfreeClient().PGOrderFetchPayments(orderId);
    return Array.isArray(response.data) ? response.data : [];
  },
  recordSuccess = recordCashfreeSuccess,
  pruneSessions = pruneExpiredRefreshTokens,
  now = new Date(),
} = {}) {
  const today = todayInGymTz(now);
  const [expiredCount] = await MembershipModel.update(
    { status: "expired" },
    { where: { status: "active", endDate: { [Op.lt]: today } } },
  );
  const [cancelledCount] = await MembershipModel.update(
    { status: "cancelled" },
    {
      where: {
        status: "pending_payment",
        createdAt: { [Op.lt]: new Date(now.getTime() - PENDING_PAYMENT_TTL_MS) },
      },
    },
  );

  const summary = {
    expired: expiredCount,
    cancelledPending: cancelledCount,
    ordersRecorded: 0,
    ordersFailed: 0,
    orderErrors: 0,
    sessionsPruned: await pruneSessions(now),
  };
  const staleOrders = await OrderModel.findAll({ where: { status: "pending", expiresAt: { [Op.lte]: now } } });
  for (const order of staleOrders) {
    try {
      const payments = await fetchPayments(order.cashfreeOrderId);
      const action = staleOrderAction(payments);
      if (action === "record") {
        await recordSuccess(order, payments.find((payment) => payment.payment_status === "SUCCESS"));
        summary.ordersRecorded += 1;
      } else if (action === "fail") {
        await order.update({ status: "failed" });
        summary.ordersFailed += 1;
      }
    } catch (error) {
      summary.orderErrors += 1;
      console.error("Daily job could not reconcile Cashfree order.", {
        orderId: order.cashfreeOrderId,
        message: error?.response?.data?.message ?? error.message,
      });
    }
  }
  return summary;
}

// The transaction-scoped advisory lock is held until the job finishes, so only one instance runs it
// even if RUN_JOBS is set on several; the work itself uses other pooled connections.
export async function runDailyJobWithLock({ database = sequelize, ...options } = {}) {
  return database.transaction(async (transaction) => {
    const [{ locked }] = await database.query(
      "SELECT pg_try_advisory_xact_lock(hashtext(:key)) AS locked",
      { replacements: { key: DAILY_JOB_LOCK_KEY }, type: QueryTypes.SELECT, transaction },
    );
    if (!locked) return null;
    return runDailyJob(options);
  });
}

export function startDailyJob() {
  const timezone = process.env.GYM_TIMEZONE ?? "Asia/Kolkata";
  return cron.schedule("5 0 * * *", async () => {
    try {
      const summary = await runDailyJobWithLock();
      if (!summary) {
        console.log("Daily job skipped: another instance holds the lock.");
        return;
      }
      console.log(
        `Daily job: ${summary.expired} memberships expired, ${summary.cancelledPending} unpaid cancelled, `
        + `${summary.ordersRecorded} Cashfree orders recorded, ${summary.ordersFailed} failed, ${summary.orderErrors} errors, `
        + `${summary.sessionsPruned} expired sessions pruned.`,
      );
    } catch (error) {
      console.error("Daily job failed:", error);
    }
  }, { timezone });
}
