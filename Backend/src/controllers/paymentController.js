import { Op } from "sequelize";
import { randomUUID } from "node:crypto";
import { CashfreeOrder, Client, Course, Member, Membership, Payment, PaymentDetails, User } from "../models/index.js";
import { sequelize } from "../database.js";
import { canAccessClient } from "../utils/access.js";
import {
  getCashfreeClient,
  getCashfreePaymentMethod,
  getCashfreePaymentStatus,
  getCashfreeReturnUrl,
} from "../services/cashfree.js";

export async function createPayment(req, res) {
  const value = req.validated.body;
  try {
    const client = await Client.findByPk(value.clientId);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    let membership;
    if (value.membershipId) {
      membership = await Membership.findByPk(value.membershipId);
      if (!membership || membership.clientId !== client.userId) {
        return res.status(400).json({ status: "error", message: "Membership does not belong to this client." });
      }
    }
    const payment = await sequelize.transaction(async (transaction) => {
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
      return createdPayment;
    });
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
    const payments = await Payment.findAll({
      where,
      include,
      order: [["dateTime", "DESC"]],
    });
    return res.json({ status: "success", data: payments });
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
      where: { reminderDate: { [Op.lte]: new Date().toISOString().slice(0, 10) } },
      include: [
        { model: Payment },
        { model: Client, include: [{ model: User, attributes: ["id", "fullName", "email"] }] },
      ],
      order: [["reminderDate", "ASC"]],
    });
    return res.json({ status: "success", data: reminders });
  } catch (error) {
    console.error("Payment reminders lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve payment reminders." });
  }
}

export async function updatePayment(req, res) {
  const value = req.validated.body;
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ status: "error", message: "Payment not found." });
    }
    await payment.update(value);
    if (Object.hasOwn(value, "reminderDate")) {
      await PaymentDetails.update(
        { reminderDate: value.reminderDate },
        { where: { paymentId: payment.id } },
      );
    }
    return res.json({ status: "success", data: payment });
  } catch (error) {
    console.error("Payment update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update payment." });
  }
}

export async function createCashfreeOrder(req, res) {
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
      membership = await Membership.findByPk(value.membershipId, { include: [{ model: Payment }] });
      if (!membership || membership.clientId !== client.userId) {
        return res.status(404).json({ status: "error", message: "Membership not found." });
      }
      if (membership.status !== "active") {
        return res.status(409).json({ status: "error", message: "Only active memberships can be paid online." });
      }
      const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      amount = Number((Number(membership.totalAmount) - paid).toFixed(2));
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
        membership = await Membership.findByPk(value.membershipId, { include: [{ model: Payment }] });
        if (!membership || membership.clientId !== client.userId) {
          return res.status(400).json({ status: "error", message: "Membership does not belong to this client." });
        }
        if (membership.status === "cancelled") {
          return res.status(409).json({ status: "error", message: "Cancelled memberships cannot be paid." });
        }
        const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const due = Number((Number(membership.totalAmount) - paid).toFixed(2));
        if (amount > due) {
          return res.status(400).json({ status: "error", message: "Payment amount exceeds the membership balance." });
        }
      }
    }

    if (!(amount > 0)) {
      return res.status(409).json({ status: "error", message: "There is no balance due for this membership." });
    }

    if (membership) {
      const now = new Date();
      await CashfreeOrder.update(
        { status: "failed" },
        { where: { membershipId: membership.id, status: "pending", expiresAt: { [Op.lte]: now } } },
      );
      const pendingOrder = await CashfreeOrder.findOne({
        where: { membershipId: membership.id, status: "pending", expiresAt: { [Op.gt]: now } },
      });
      if (pendingOrder) {
        return res.status(409).json({
          status: "error",
          message: "A checkout is already in progress for this membership. Try again after it expires.",
        });
      }
    }

    const user = await User.findByPk(client.userId, { attributes: ["fullName", "email"] });
    const member = await Member.findByPk(client.userId, { attributes: ["phone"] });
    const phone = client.phone || member?.phone;
    if (!phone) {
      return res.status(400).json({ status: "error", message: "Add a phone number to the client profile before checkout." });
    }

    const orderId = `fitconsole_${randomUUID().replaceAll("-", "")}`;
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
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
    if (!providerOrder?.payment_session_id || !providerOrder.order_id) {
      throw new Error("Cashfree did not return an order ID and payment session.");
    }

    await CashfreeOrder.create({
      cashfreeOrderId: providerOrder.order_id,
      clientId: client.id,
      membershipId: membership?.id ?? null,
      createdById: req.user.id,
      amount: Number(amount.toFixed(2)),
      reminderDate: value.reminderDate ?? null,
      expiresAt,
    });

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
      if (paymentStatus === "failed" && order.status !== "failed") {
        await order.update({ status: "failed" });
      }
      return res.json({ status: "success", data: { orderId: order.cashfreeOrderId, paymentStatus } });
    }

    const successfulPayment = payments.find((payment) => payment.payment_status === "SUCCESS");
    const paidAmount = Number(successfulPayment.payment_amount ?? successfulPayment.order_amount);
    const paymentMethod = getCashfreePaymentMethod(successfulPayment.payment_group);
    if (
      successfulPayment.order_id !== order.cashfreeOrderId
      || (successfulPayment.payment_currency && successfulPayment.payment_currency !== "INR")
      || !Number.isFinite(paidAmount)
      || paidAmount !== Number(order.amount)
      || !paymentMethod
    ) {
      console.error("Cashfree payment verification returned unexpected order details.");
      return res.status(502).json({ status: "error", message: "Cashfree payment details could not be verified." });
    }

    let recordedPayment;
    await sequelize.transaction(async (transaction) => {
      const lockedOrder = await CashfreeOrder.findByPk(order.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (lockedOrder.status === "success" && lockedOrder.paymentId) {
        recordedPayment = await Payment.findByPk(lockedOrder.paymentId, { transaction });
        return;
      }

      const completedAt = successfulPayment.payment_completion_time ?? successfulPayment.payment_time;
      const dateTime = completedAt && !Number.isNaN(Date.parse(completedAt))
        ? new Date(completedAt)
        : new Date();
      recordedPayment = await Payment.create({
        membershipId: lockedOrder.membershipId,
        amount: lockedOrder.amount,
        paymentMethod,
        reference: `Cashfree ${lockedOrder.cashfreeOrderId} (${successfulPayment.cf_payment_id ?? "payment"})`,
        dateTime,
      }, { transaction });
      await PaymentDetails.create({
        paymentId: recordedPayment.id,
        clientId: lockedOrder.clientId,
        reminderDate: lockedOrder.reminderDate,
      }, { transaction });
      await lockedOrder.update({
        status: "success",
        paymentId: recordedPayment.id,
      }, { transaction });
    });

    return res.json({
      status: "success",
      data: { orderId: order.cashfreeOrderId, paymentStatus: "success", payment: recordedPayment },
    });
  } catch (error) {
    console.error("Cashfree order verification failed:", error?.response?.data?.message ?? error.message);
    return res.status(502).json({ status: "error", message: "Unable to verify Cashfree payment." });
  }
}
