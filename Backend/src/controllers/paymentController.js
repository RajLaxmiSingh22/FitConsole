import { Op } from "sequelize";
import { todayInGymTz } from "../utils/dates.js";
import { randomUUID } from "node:crypto";
import { CashfreeOrder, Client, Course, Member, Membership, Payment, PaymentDetails, ReminderLog, User } from "../models/index.js";
import { sequelize } from "../database.js";
import { canAccessClient } from "../utils/access.js";
import {
  remainingMembershipBalance,
  membershipStatusForBalance,
  toMinorUnits,
} from "../utils/membershipPayments.js";
import { hasAcceptedCurrentWaiver } from "../utils/waiver.js";
import { writePaymentAudit } from "../services/paymentAudit.js";
import {
  getCashfreeClient,
  getCashfreePaymentStatus,
  getCashfreeReturnUrl,
} from "../services/cashfree.js";
import { recordCashfreeSuccess } from "../services/cashfreePayment.js";
import { isReminderOpen, syncMembershipReminders } from "../utils/paymentReminders.js";
import { buildReminderMessage, buildWhatsAppLink, normalizeIndianMobile } from "../utils/whatsappReminder.js";
import { getPagination, paginatedData } from "../utils/pagination.js";

export async function createPayment(req, res) {
  const value = req.validated.body;
  try {
    const client = await Client.findByPk(value.clientId);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const result = await sequelize.transaction(async (transaction) => {
      let membership;
      if (value.membershipId) {
        membership = await Membership.findByPk(value.membershipId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!membership || membership.clientId !== client.userId) {
          return { error: "Membership does not belong to this client.", status: 400 };
        }
        if (membership.status === "cancelled") {
          return { error: "Cancelled memberships cannot receive payments.", status: 409 };
        }
        const payments = await Payment.findAll({
          where: { membershipId: membership.id, voidedAt: null },
          attributes: ["amount"],
          transaction,
        });
        const remaining = remainingMembershipBalance(membership.totalAmount, payments);
        if (toMinorUnits(value.amount) > toMinorUnits(remaining)) {
          return { error: "Payment amount exceeds the membership balance.", status: 400 };
        }
      }
      const createdPayment = await Payment.create({
        membershipId: membership?.id ?? null,
        amount: value.amount,
        paymentMethod: value.paymentMethod,
        reference: value.reference,
        dateTime: new Date(),
      }, { transaction });
      await PaymentDetails.create({
        paymentId: createdPayment.id,
        clientId: client.id,
        reminderDate: value.reminderDate,
      }, { transaction });
      await writePaymentAudit({
        paymentId: createdPayment.id,
        userId: req.user.id,
        action: "create",
        newValues: createdPayment.toJSON(),
        transaction,
      });
      if (membership) {
        const payments = await Payment.findAll({
          where: { membershipId: membership.id, voidedAt: null },
          attributes: ["amount"],
          transaction,
        });
        const nextStatus = membershipStatusForBalance(membership.totalAmount, payments, membership.status);
        if (nextStatus !== membership.status) await membership.update({ status: nextStatus }, { transaction });
        await syncMembershipReminders(membership, payments, transaction);
      }
      return { payment: createdPayment };
    });
    if (result.error) {
      return res.status(result.status).json({ status: "error", message: result.error });
    }
    const payment = result.payment;
    return res.status(201).json({
      status: "success",
      data: { ...payment.toJSON(), clientId: client.id, reminderDate: value.reminderDate ?? null },
    });
  } catch (error) {
    console.error("Payment creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to record payment." });
  }
}

export async function listPayments(req, res) {
  try {
    const value = req.validated.query;
    const where = {};
    if (value.paymentMethod) where.paymentMethod = value.paymentMethod;
    const include = [{
      model: PaymentDetails,
      required: Boolean(value.clientId),
      ...(value.clientId ? { where: { clientId: value.clientId } } : {}),
      include: [{ model: Client, include: [{ model: User, attributes: ["id", "fullName", "email"] }] }],
    }, {
      model: Membership,
      include: [{ model: Course, attributes: ["id", "name"] }],
    }];
    if (value.from || value.to) {
      where.dateTime = {};
      if (value.from) where.dateTime[Op.gte] = value.from;
      if (value.to) where.dateTime[Op.lte] = value.to;
    }
    const pagination = getPagination(value);
    const { rows, count } = await Payment.findAndCountAll({
      where,
      include,
      distinct: true,
      order: [["dateTime", "DESC"]],
      ...(pagination ? { limit: pagination.limit, offset: pagination.offset } : {}),
    });
    return res.json({ status: "success", data: paginatedData(rows, count, pagination) });
  } catch (error) {
    console.error("Payment list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve payments." });
  }
}

export async function listClientPayments(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const payments = await Payment.findAll({
      include: [{
        model: PaymentDetails,
        where: { clientId: req.params.id },
        required: true,
      }],
      order: [["dateTime", "DESC"]],
    });
    return res.json({ status: "success", data: payments });
  } catch (error) {
    console.error("Client payment history failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve payment history." });
  }
}

export async function listPaymentReminders(_req, res) {
  try {
    const reminders = await PaymentDetails.findAll({
      where: { reminderDate: { [Op.lte]: todayInGymTz() }, resolvedAt: null },
      include: [
        {
          model: Payment,
          where: { voidedAt: null },
          required: true,
          include: [{
            model: Membership,
            required: false,
            include: [{ model: Payment, attributes: ["amount", "voidedAt"], where: { voidedAt: null }, required: false }],
          }],
        },
        { model: Client, include: [{ model: User, attributes: ["id", "fullName", "email"] }] },
      ],
      order: [["reminderDate", "ASC"]],
    });
    const open = reminders.filter((reminder) => isReminderOpen(reminder, reminder.Payment.Membership));
    return res.json({ status: "success", data: open });
  } catch (error) {
    console.error("Payment reminders lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve payment reminders." });
  }
}

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Returns a WhatsApp click-to-chat link for the owner to send; FitConsole itself sends nothing.
export async function sendPaymentReminder(req, res) {
  const baseUrl = process.env.FRONTEND_PUBLIC_URL;
  if (!baseUrl) {
    return res.status(503).json({ status: "error", message: "FRONTEND_PUBLIC_URL must be configured to send reminders." });
  }
  try {
    const details = await PaymentDetails.findByPk(req.params.paymentId, {
      include: [
        { model: Client, include: [{ model: User, attributes: ["fullName"] }] },
        {
          model: Payment,
          where: { voidedAt: null },
          include: [{
            model: Membership,
            include: [Course, { model: Payment, attributes: ["amount", "voidedAt"], where: { voidedAt: null }, required: false }],
          }],
        },
      ],
    });
    const membership = details?.Payment?.Membership;
    if (!details || !details.Client) return res.status(404).json({ status: "error", message: "Payment reminder not found." });
    if (!membership) {
      return res.status(409).json({ status: "error", message: "Only reminders linked to a membership can be sent." });
    }
    const amountDue = remainingMembershipBalance(membership.totalAmount, membership.Payments);
    if (details.resolvedAt || amountDue <= 0) {
      return res.status(409).json({ status: "error", message: "This membership has no outstanding balance." });
    }
    const mobile = normalizeIndianMobile(details.Client.phone);
    if (!mobile) {
      return res.status(422).json({ status: "error", message: "Add a valid 10-digit Indian mobile number to this client first." });
    }

    const result = await sequelize.transaction(async (transaction) => {
      await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
        replacements: { key: `reminder:${details.clientId}` },
        transaction,
      });
      const recent = await ReminderLog.findOne({
        where: { clientId: details.clientId, createdAt: { [Op.gt]: new Date(Date.now() - REMINDER_COOLDOWN_MS) } },
        order: [["createdAt", "DESC"]],
        transaction,
      });
      if (recent) return { recent };
      return {
        log: await ReminderLog.create({
          paymentId: details.paymentId,
          clientId: details.clientId,
          sentById: req.user.id,
          amountDue,
        }, { transaction }),
      };
    });
    if (result.recent) {
      const retryAt = new Date(result.recent.createdAt.getTime() + REMINDER_COOLDOWN_MS);
      res.set("Retry-After", String(Math.ceil((retryAt - Date.now()) / 1000)));
      return res.status(429).json({ status: "error", message: "A reminder was already sent to this member in the last 24 hours." });
    }

    const payUrl = new URL("/login", baseUrl);
    payUrl.searchParams.set("section", "Membership");
    const message = buildReminderMessage({
      name: details.Client.User?.fullName ?? "there",
      amountDue,
      course: membership.Course?.name ?? "gym",
      dueDate: details.reminderDate ?? membership.endDate,
      payUrl: payUrl.toString(),
    });
    return res.status(201).json({
      status: "success",
      data: { whatsappUrl: buildWhatsAppLink(mobile, message), amountDue, sentAt: result.log.createdAt },
    });
  } catch (error) {
    console.error("Payment reminder send failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to prepare the payment reminder." });
  }
}

export async function resolvePaymentReminder(req, res) {
  try {
    const details = await PaymentDetails.findByPk(req.params.paymentId);
    if (!details) return res.status(404).json({ status: "error", message: "Payment reminder not found." });
    if (!details.resolvedAt) await details.update({ resolvedAt: new Date() });
    return res.json({ status: "success", data: details });
  } catch (error) {
    console.error("Payment reminder resolution failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to resolve payment reminder." });
  }
}

export async function updatePayment(req, res) {
  const value = req.validated.body;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const payment = await Payment.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!payment) return { status: 404, message: "Payment not found." };
      if (payment.voidedAt) return { status: 409, message: "Voided payments cannot be changed." };
      const linkedCashfreeOrder = await CashfreeOrder.findOne({
        where: { paymentId: payment.id },
        transaction,
      });
      const isCashfreePayment = Boolean(
        payment.reference?.startsWith("Cashfree ") || linkedCashfreeOrder,
      );
      if (
        isCashfreePayment
        && Object.keys(value).some((key) => key !== "reminderDate")
      ) {
        return { status: 409, message: "Cashfree payment amounts and methods cannot be changed." };
      }

      const details = await PaymentDetails.findOne({
        where: { paymentId: payment.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const oldValues = { payment: payment.toJSON(), reminderDate: details?.reminderDate ?? null };
      const { reminderDate, ...paymentChanges } = value;
      if (Object.hasOwn(value, "reminderDate")) {
        if (!details) return { status: 409, message: "Payment reminder details are unavailable." };
        await details.update({ reminderDate }, { transaction });
      }
      if (!isCashfreePayment && Object.keys(paymentChanges).length) {
        await payment.update(paymentChanges, { transaction });
      }
      await writePaymentAudit({
        paymentId: payment.id,
        userId: req.user.id,
        action: "update",
        oldValues,
        newValues: {
          payment: { ...oldValues.payment, ...paymentChanges },
          reminderDate: Object.hasOwn(value, "reminderDate") ? reminderDate : oldValues.reminderDate,
        },
        transaction,
      });
      return { payment };
    });
    if (result.status) {
      return res.status(result.status).json({ status: "error", message: result.message });
    }
    return res.json({ status: "success", data: result.payment });
  } catch (error) {
    console.error("Payment update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update payment." });
  }
}

export async function voidPayment(req, res) {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const payment = await Payment.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!payment) return { status: 404, message: "Payment not found." };
      if (payment.voidedAt) return { status: 409, message: "Payment has already been voided." };

      const oldValues = payment.toJSON();
      const voidedAt = new Date();
      await payment.update({
        voidedAt,
        voidReason: req.validated.body.reason,
      }, { transaction });
      await writePaymentAudit({
        paymentId: payment.id,
        userId: req.user.id,
        action: "void",
        oldValues,
        newValues: payment.toJSON(),
        transaction,
      });

      if (payment.membershipId) {
        const membership = await Membership.findByPk(payment.membershipId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (membership) {
          const payments = await Payment.findAll({
            where: { membershipId: membership.id, voidedAt: null },
            attributes: ["amount"],
            transaction,
          });
          const nextStatus = membershipStatusForBalance(membership.totalAmount, payments, membership.status);
          if (nextStatus !== membership.status) await membership.update({ status: nextStatus }, { transaction });
          await syncMembershipReminders(membership, payments, transaction);
        }
      }
      return { payment };
    });
    if (result.status) return res.status(result.status).json({ status: "error", message: result.message });
    return res.json({ status: "success", data: result.payment });
  } catch (error) {
    console.error("Payment void failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to void payment." });
  }
}

export async function createCashfreeOrder(req, res) {
  let localOrder;
  try {
    const value = req.validated.body;
    let client;
    let membership;
    let amount;

    if (req.user.role === "client") {
      if (!value.membershipId || value.clientId || value.amount || value.reminderDate) {
        return res.status(400).json({ status: "error", message: "Select a membership to pay." });
      }
      client = await Client.findOne({ where: { userId: req.user.id } });
      if (!client) {
        return res.status(404).json({ status: "error", message: "Client profile not found." });
      }
      if (!(await hasAcceptedCurrentWaiver(client.id))) {
        return res.status(403).json({
          status: "error",
          message: "Accept the current training waiver first.",
          code: "WAIVER_REQUIRED",
        });
      }
      membership = await Membership.findByPk(value.membershipId, {
        include: [{
          model: Payment,
          attributes: ["amount", "voidedAt"],
          where: { voidedAt: null },
          required: false,
        }],
      });
      if (!membership || membership.clientId !== client.userId) {
        return res.status(404).json({ status: "error", message: "Membership not found." });
      }
      if (!["active", "pending_payment"].includes(membership.status)) {
        return res.status(409).json({ status: "error", message: "This membership cannot be paid online." });
      }
      amount = remainingMembershipBalance(membership.totalAmount, membership.Payments);
    } else {
      if (!value.clientId || !value.amount) {
        return res.status(400).json({ status: "error", message: "Client and amount are required for owner checkout." });
      }
      client = await Client.findByPk(value.clientId);
      if (!client) {
        return res.status(404).json({ status: "error", message: "Client not found." });
      }
      amount = value.amount;
      if (value.membershipId) {
        membership = await Membership.findByPk(value.membershipId, {
          include: [{
            model: Payment,
            attributes: ["amount", "voidedAt"],
            where: { voidedAt: null },
            required: false,
          }],
        });
        if (!membership || membership.clientId !== client.userId) {
          return res.status(400).json({ status: "error", message: "Membership does not belong to this client." });
        }
        if (!["active", "pending_payment"].includes(membership.status)) {
          return res.status(409).json({ status: "error", message: "This membership cannot be paid." });
        }
        const due = remainingMembershipBalance(membership.totalAmount, membership.Payments);
        if (toMinorUnits(amount) > toMinorUnits(due)) {
          return res.status(400).json({ status: "error", message: "Payment amount exceeds the membership balance." });
        }
      }
    }

    if (!(amount > 0)) {
      return res.status(409).json({ status: "error", message: "There is no balance due for this membership." });
    }

    const user = await User.findByPk(client.userId, { attributes: ["fullName", "email"] });
    const member = await Member.findByPk(client.userId, { attributes: ["phone"] });
    const phone = client.phone || member?.phone;
    if (!phone) {
      return res.status(400).json({ status: "error", message: "Add a phone number to the client profile before checkout." });
    }

    const orderId = `fitconsole_${randomUUID().replaceAll("-", "")}`;
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
    const reservation = await sequelize.transaction(async (transaction) => {
      if (membership) {
        await sequelize.query(
          "SELECT pg_advisory_xact_lock(hashtext(:key))",
          { replacements: { key: `cf-membership:${membership.id}` }, transaction },
        );
        const now = new Date();
        await CashfreeOrder.update(
          { status: "failed" },
          {
            where: { membershipId: membership.id, status: "pending", expiresAt: { [Op.lte]: now } },
            transaction,
          },
        );
        const pendingOrder = await CashfreeOrder.findOne({
          where: { membershipId: membership.id, status: "pending", expiresAt: { [Op.gt]: now } },
          transaction,
        });
        if (pendingOrder) return { pendingOrder: true };
      }

      localOrder = await CashfreeOrder.create({
        cashfreeOrderId: orderId,
        clientId: client.id,
        membershipId: membership?.id ?? null,
        createdById: req.user.id,
        amount: Number(amount.toFixed(2)),
        reminderDate: value.reminderDate ?? null,
        expiresAt,
      }, { transaction });
      return { localOrder };
    });
    if (reservation.pendingOrder) {
      return res.status(409).json({
        status: "error",
        message: "A checkout is already in progress for this membership. Try again after it expires.",
      });
    }

    const cashfree = getCashfreeClient();
    const response = await cashfree.PGCreateOrder({
      order_id: orderId,
      order_amount: Number(amount.toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: client.userId,
        customer_name: user?.fullName ?? "FitConsole member",
        customer_email: user?.email ?? "",
        customer_phone: phone,
      },
      order_meta: {
        return_url: getCashfreeReturnUrl("{order_id}"),
        payment_methods: "cc,dc,upi",
      },
      order_expiry_time: expiresAt.toISOString(),
      order_note: "FitConsole membership payment",
    });
    const providerOrder = response.data;
    if (!providerOrder?.payment_session_id || providerOrder.order_id !== orderId) {
      throw new Error("Cashfree did not return an order ID and payment session.");
    }

    await localOrder.update({ paymentSessionId: providerOrder.payment_session_id });

    return res.status(201).json({
      status: "success",
      data: {
        orderId: providerOrder.order_id,
        paymentSessionId: providerOrder.payment_session_id,
        amount: Number(amount.toFixed(2)),
        currency: "INR",
      },
    });
  } catch (error) {
    if (localOrder) {
      try {
        await localOrder.update({ status: "failed" });
      } catch (updateError) {
        console.error("Failed to mark unsuccessful Cashfree order as failed:", updateError);
      }
    }
    console.error("Cashfree order creation failed:", error?.response?.data?.message ?? error.message);
    return res.status(502).json({ status: "error", message: "Unable to start Cashfree checkout." });
  }
}

export async function verifyCashfreeOrder(req, res) {
  try {
    const order = await CashfreeOrder.findOne({
      where: { cashfreeOrderId: req.validated.params.orderId },
    });
    if (!order) {
      return res.status(404).json({ status: "error", message: "Cashfree order not found." });
    }
    if (req.user.role === "client" && !(await canAccessClient(req.user, order.clientId))) {
      return res.status(404).json({ status: "error", message: "Cashfree order not found." });
    }
    if (order.status === "success" && order.paymentId) {
      return res.json({ status: "success", data: { orderId: order.cashfreeOrderId, paymentStatus: "success" } });
    }

    const response = await getCashfreeClient().PGOrderFetchPayments(order.cashfreeOrderId);
    const payments = Array.isArray(response.data) ? response.data : [];
    const paymentStatus = getCashfreePaymentStatus(payments);
    if (paymentStatus !== "success") {
      if (paymentStatus === "failed" && order.status !== "failed" && order.expiresAt <= new Date()) {
        await order.update({ status: "failed" });
      }
      return res.json({ status: "success", data: { orderId: order.cashfreeOrderId, paymentStatus } });
    }

    const successfulPayment = payments.find((payment) => payment.payment_status === "SUCCESS");
    let recordedPayment;
    try {
      recordedPayment = await recordCashfreeSuccess(order, successfulPayment);
    } catch (error) {
      console.error("Cashfree payment details could not be recorded:", error);
      return res.status(502).json({ status: "error", message: "Cashfree payment details could not be verified." });
    }

    return res.json({
      status: "success",
      data: { orderId: order.cashfreeOrderId, paymentStatus: "success", payment: recordedPayment },
    });
  } catch (error) {
    console.error("Cashfree order verification failed:", error?.response?.data?.message ?? error.message);
    return res.status(502).json({ status: "error", message: "Unable to verify Cashfree payment." });
  }
}

async function processCashfreeWebhookEvent(event) {
  try {
    if (event.type !== "PAYMENT_SUCCESS_WEBHOOK") return;
    const orderId = event.object?.data?.order?.order_id ?? event.object?.data?.order_id;
    if (typeof orderId !== "string" || !orderId) {
      console.warn("Cashfree payment webhook did not include an order ID.");
      return;
    }
    const order = await CashfreeOrder.findOne({ where: { cashfreeOrderId: orderId } });
    if (!order) {
      console.warn("Cashfree payment webhook referenced an unknown order.", { orderId });
      return;
    }
    const response = await getCashfreeClient().PGOrderFetchPayments(order.cashfreeOrderId);
    const payments = Array.isArray(response.data) ? response.data : [];
    const successfulPayment = payments.find((payment) =>
      payment.payment_status === "SUCCESS" && payment.order_id === order.cashfreeOrderId
    );
    if (!successfulPayment) {
      console.warn("Cashfree webhook order did not have a successful provider payment.", { orderId });
      return;
    }
    await recordCashfreeSuccess(order, successfulPayment);
  } catch (error) {
    console.error("Cashfree webhook processing failed:", error?.response?.data?.message ?? error.message);
  }
}

export function cashfreeWebhook(req, res) {
  const signature = req.get("x-webhook-signature");
  const timestamp = req.get("x-webhook-timestamp");
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : null;
  const timestampValue = Number(timestamp);
  const timestampMs = timestampValue < 1_000_000_000_000 ? timestampValue * 1000 : timestampValue;
  const ageMs = Date.now() - timestampMs;
  if (
    !signature
    || !timestamp
    || !rawBody
    || !Number.isFinite(timestampMs)
    || ageMs > 5 * 60 * 1000
    || ageMs < -5 * 60 * 1000
  ) {
    return res.status(401).json({ status: "error", message: "Invalid Cashfree webhook signature." });
  }

  let event;
  try {
    event = getCashfreeClient().PGVerifyWebhookSignature(signature, rawBody, timestamp).object;
  } catch (error) {
    console.warn("Cashfree webhook signature verification failed:", error.message);
    return res.status(401).json({ status: "error", message: "Invalid Cashfree webhook signature." });
  }

  setImmediate(() => {
    void processCashfreeWebhookEvent(event);
  });
  return res.status(200).json({ status: "success" });
}
