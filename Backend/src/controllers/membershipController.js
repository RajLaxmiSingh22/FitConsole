import { Op } from "sequelize";
import { Client, Course, CoursePlan, Member, Membership, Payment, PaymentDetails, User } from "../models/index.js";
import { sequelize } from "../database.js";
import { canAccessClient } from "../utils/access.js";
import { addMembershipMonths, getMembershipDurationMonths } from "../utils/membershipDates.js";

export async function createMembership(req, res) {
  const value = req.validated.body;
  try {
    const [client, coursePlan] = await Promise.all([
      Client.findByPk(value.clientId),
      CoursePlan.findOne({ where: { courseId: value.courseId, durationMonths: value.durationMonths } }),
    ]);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    if (!coursePlan) {
      return res.status(404).json({ status: "error", message: "Course plan not found." });
    }
    const startDate = value.startDate ? value.startDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const membership = await sequelize.transaction(async (transaction) => {
      const createdMembership = await Membership.create({
        clientId: client.userId,
        courseId: value.courseId,
        startDate,
        endDate: addMembershipMonths(startDate, value.durationMonths),
        totalAmount: coursePlan.price,
        status: "active",
      }, { transaction });

      if (value.paymentMethod) {
        const payment = await Payment.create({
          membershipId: createdMembership.id,
          amount: coursePlan.price,
          paymentMethod: value.paymentMethod,
          reference: value.reference,
          dateTime: new Date(),
        }, { transaction });
        await PaymentDetails.create({
          paymentId: payment.id,
          clientId: client.id,
        }, { transaction });
      }

      return createdMembership;
    });
    return res.status(201).json({
      status: "success",
      data: { ...membership.toJSON(), paymentRecorded: Boolean(value.paymentMethod) },
    });
  } catch (error) {
    console.error("Membership creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create membership." });
  }
}

export async function createClientMembership(req, res) {
  const value = req.validated.body;
  try {
    const [client, course, coursePlan] = await Promise.all([
      Client.findOne({ where: { userId: req.user.id } }),
      Course.findOne({ where: { id: value.courseId, active: true } }),
      CoursePlan.findOne({ where: { courseId: value.courseId, durationMonths: value.durationMonths } }),
    ]);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client profile not found." });
    }
    if (!course || !coursePlan) {
      return res.status(404).json({ status: "error", message: "This course offer is no longer available." });
    }

    const today = new Date().toISOString().slice(0, 10);
    const currentMembership = await Membership.findOne({
      where: { clientId: req.user.id, courseId: course.id, status: "active", endDate: { [Op.gte]: today } },
      include: [{ model: Payment, attributes: ["amount"] }],
      order: [["endDate", "DESC"]],
    });
    let startDate = today;
    if (currentMembership) {
      const paid = (currentMembership.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      if (paid < Number(currentMembership.totalAmount)) {
        return res.status(409).json({
          status: "error",
          message: "You already have an unpaid membership for this course. Pay its outstanding balance below.",
        });
      }
      startDate = new Date(
        new Date(`${currentMembership.endDate}T00:00:00.000Z`).getTime() + 86400000,
      ).toISOString().slice(0, 10);
    }

    const membership = await Membership.create({
      clientId: req.user.id,
      courseId: course.id,
      startDate,
      endDate: addMembershipMonths(startDate, value.durationMonths),
      totalAmount: coursePlan.price,
      status: "active",
    });
    return res.status(201).json({ status: "success", data: membership });
  } catch (error) {
    console.error("Client membership purchase failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to start this membership." });
  }
}

export async function listMemberships(req, res) {
  try {
    const value = req.validated.query;
    const today = new Date().toISOString().slice(0, 10);
    await Membership.update(
      { status: "expired" },
      { where: { status: "active", endDate: { [Op.lt]: today } } },
    );
    const where = {};
    if (value.status) where.status = value.status;
    if (value.expiringWithin !== undefined) {
      const today = new Date().toISOString().slice(0, 10);
      const until = new Date(Date.now() + value.expiringWithin * 86400000).toISOString().slice(0, 10);
      where.status = "active";
      where.endDate = { [Op.between]: [today, until] };
    }
    const memberships = await Membership.findAll({
      where,
      include: [
        { model: Member, include: [{ model: User, attributes: ["id", "fullName", "email"] }] },
        Course,
        { model: Payment, attributes: ["id", "amount", "paymentMethod", "dateTime"] },
      ],
      order: [["endDate", "ASC"]],
    });
    return res.json({ status: "success", data: memberships });
  } catch (error) {
    console.error("Membership list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve memberships." });
  }
}

export async function listClientMemberships(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ status: "error", message: "Client not found." });
    const memberships = await Membership.findAll({
      where: { clientId: client.userId },
      include: [Course, { model: Payment, attributes: ["id", "amount", "paymentMethod", "dateTime"] }],
      order: [["createdAt", "DESC"]],
    });
    return res.json({ status: "success", data: memberships });
  } catch (error) {
    console.error("Client memberships lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve memberships." });
  }
}

export async function renewMembership(req, res) {
  try {
    const membership = await Membership.findByPk(req.params.id);
    if (!membership) {
      return res.status(404).json({ status: "error", message: "Membership not found." });
    }
    if (membership.status === "cancelled") {
      return res.status(409).json({ status: "error", message: "Cancelled memberships cannot be renewed." });
    }
    const startDate = membership.endDate >= new Date().toISOString().slice(0, 10)
      ? new Date(new Date(`${membership.endDate}T00:00:00.000Z`).getTime() + 86400000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    await membership.update({
      startDate,
      endDate: addMembershipMonths(startDate, getMembershipDurationMonths(membership.startDate, membership.endDate)),
      status: "active",
    });
    return res.json({ status: "success", data: membership });
  } catch (error) {
    console.error("Membership renewal failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to renew membership." });
  }
}

export async function cancelMembership(req, res) {
  try {
    const membership = await Membership.findByPk(req.params.id);
    if (!membership) {
      return res.status(404).json({ status: "error", message: "Membership not found." });
    }
    await membership.update({ status: "cancelled" });
    return res.json({ status: "success", data: membership });
  } catch (error) {
    console.error("Membership cancellation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to cancel membership." });
  }
}
