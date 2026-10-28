import { Op } from "sequelize";
import { Client, Course, CoursePlan, Member, Membership, Payment, PaymentDetails, User, UserStatus } from "../models/index.js";
import { sequelize } from "../database.js";
import { canAccessClient } from "../utils/access.js";
import { addMembershipMonths, getMembershipDurationMonths } from "../utils/membershipDates.js";
import { getRenewalDates, hasLaterActiveMembership } from "../utils/membershipRenewal.js";
import { getExistingPendingMembership } from "../utils/pendingMembership.js";
import { addDaysToDateString, todayInGymTz } from "../utils/dates.js";
import { isMembershipPaid } from "../utils/membershipPayments.js";
import { hasAcceptedCurrentWaiver } from "../utils/waiver.js";
import { writePaymentAudit } from "../services/paymentAudit.js";
import { membershipPeriodsOverlap } from "../utils/membershipOverlap.js";
import { getPagination, paginatedData } from "../utils/pagination.js";

export async function createMembership(req, res) {
  const value = req.validated.body;
  try {
    const [client, course, coursePlan] = await Promise.all([
      Client.findByPk(value.clientId),
      Course.findByPk(value.courseId),
      CoursePlan.findOne({ where: { courseId: value.courseId, durationMonths: value.durationMonths } }),
    ]);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    if (!course || !course.active) {
      return res.status(409).json({ status: "error", message: "Course is inactive." });
    }
    if (!coursePlan) {
      return res.status(404).json({ status: "error", message: "Course plan not found." });
    }
    const clientStatus = await UserStatus.findByPk(client.userId);
    if (clientStatus?.active === false) {
      return res.status(409).json({ status: "error", message: "This client account is deactivated." });
    }
    const startDate = value.startDate ? value.startDate.toISOString().slice(0, 10) : todayInGymTz();
    const endDate = addMembershipMonths(startDate, value.durationMonths);
    const result = await sequelize.transaction(async (transaction) => {
      await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
        replacements: { key: `membership:${client.userId}:${value.courseId}` },
        transaction,
      });
      const existing = await Membership.findAll({
        where: {
          clientId: client.userId,
          courseId: value.courseId,
          status: { [Op.in]: ["active", "pending_payment"] },
        },
        attributes: ["startDate", "endDate"],
        transaction,
      });
      if (existing.some((membership) => membershipPeriodsOverlap(membership, { startDate, endDate }))) {
        return { error: "This client already has a membership for this course in that period." };
      }
      const pendingMembership = await getExistingPendingMembership(client.userId, transaction);
      if (pendingMembership) return { error: "This client already has a membership awaiting payment." };
      const createdMembership = await Membership.create({
        clientId: client.userId,
        courseId: value.courseId,
        startDate,
        endDate,
        totalAmount: coursePlan.price,
        status: "pending_payment",
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
          resolvedAt: new Date(),
        }, { transaction });
        await writePaymentAudit({
          paymentId: payment.id,
          userId: req.user.id,
          action: "create",
          newValues: payment.toJSON(),
          transaction,
        });
        if (isMembershipPaid(createdMembership.totalAmount, [payment])) {
          await createdMembership.update({ status: "active" }, { transaction });
        }
      }

      return createdMembership;
    });
    if (result?.error) return res.status(409).json({ status: "error", message: result.error });
    const membership = result;
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
    if (!(await hasAcceptedCurrentWaiver(client.id))) {
      return res.status(403).json({
        status: "error",
        message: "Accept the current training waiver first.",
        code: "WAIVER_REQUIRED",
      });
    }

    const today = todayInGymTz();
    const currentMembership = await Membership.findOne({
      where: { clientId: req.user.id, courseId: course.id, status: "active", endDate: { [Op.gte]: today } },
      include: [{
        model: Payment,
        attributes: ["amount", "voidedAt"],
        where: { voidedAt: null },
        required: false,
      }],
      order: [["endDate", "DESC"]],
    });
    let startDate = today;
    if (currentMembership) {
      if (!isMembershipPaid(currentMembership.totalAmount, currentMembership.Payments)) {
        return res.status(409).json({
          status: "error",
          message: "You already have an unpaid membership for this course. Pay its outstanding balance below.",
        });
      }
      startDate = addDaysToDateString(currentMembership.endDate, 1);
    }

    const membership = await sequelize.transaction(async (transaction) => {
      const existingPending = await getExistingPendingMembership(req.user.id, transaction);
      if (existingPending) return null;
      return Membership.create({
        clientId: req.user.id,
        courseId: course.id,
        startDate,
        endDate: addMembershipMonths(startDate, value.durationMonths),
        totalAmount: coursePlan.price,
        status: "pending_payment",
      }, { transaction });
    });
    if (!membership) {
      return res.status(409).json({ status: "error", message: "You already have a membership awaiting payment." });
    }
    return res.status(201).json({ status: "success", data: membership });
  } catch (error) {
    console.error("Client membership purchase failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to start this membership." });
  }
}

export async function listMemberships(req, res) {
  try {
    const value = req.validated.query;
    const today = todayInGymTz();
    const where = {};
    if (value.status) where.status = value.status;
    if (value.expiringWithin !== undefined) {
      const until = addDaysToDateString(today, value.expiringWithin);
      where.status = "active";
      where.endDate = { [Op.between]: [today, until] };
    }
    const pagination = getPagination(value);
    const { rows, count } = await Membership.findAndCountAll({
      distinct: true,
      where,
      include: [
        { model: Member, include: [{ model: User, attributes: ["id", "fullName", "email"] }] },
        Course,
        { model: Payment, attributes: ["id", "amount", "paymentMethod", "dateTime", "voidedAt"], where: { voidedAt: null }, required: false },
      ],
      order: [["endDate", "ASC"]],
      ...(pagination ? { limit: pagination.limit, offset: pagination.offset } : {}),
    });
    return res.json({ status: "success", data: paginatedData(rows, count, pagination) });
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
      include: [Course, { model: Payment, attributes: ["id", "amount", "paymentMethod", "dateTime", "voidedAt"], where: { voidedAt: null }, required: false }],
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
    const membership = await Membership.findByPk(req.params.id, { include: [Course] });
    if (!membership) {
      return res.status(404).json({ status: "error", message: "Membership not found." });
    }
    const value = req.validated.body ?? {};
    const today = todayInGymTz();
    const renewedMembership = await sequelize.transaction(async (transaction) => {
      if (await getExistingPendingMembership(membership.clientId, transaction)) {
        return { error: "This client already has a membership awaiting payment.", status: 409 };
      }
      const lockedMembership = await Membership.findByPk(membership.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lockedMembership) return { error: "Membership not found.", status: 404 };
      if (lockedMembership.status === "cancelled") {
        return { error: "Cancelled memberships cannot be renewed.", status: 409 };
      }
      const course = await Course.findByPk(lockedMembership.courseId, { transaction });
      if (!course?.active) {
        return { error: "Memberships for inactive courses cannot be renewed.", status: 409 };
      }

      const durationMonths = value.durationMonths
        ?? getMembershipDurationMonths(lockedMembership.startDate, lockedMembership.endDate);
      const coursePlan = await CoursePlan.findOne({
        where: { courseId: lockedMembership.courseId, durationMonths },
        transaction,
      });
      if (!coursePlan) {
        return { error: "No current pricing plan exists for this membership duration.", status: 409 };
      }

      const futureMemberships = await Membership.findAll({
        where: {
          clientId: lockedMembership.clientId,
          courseId: lockedMembership.courseId,
          status: "pending_payment",
          startDate: { [Op.gt]: lockedMembership.startDate },
          endDate: { [Op.gte]: today },
        },
        attributes: ["clientId", "courseId", "startDate", "endDate", "status"],
        transaction,
      });
      if (hasLaterActiveMembership(futureMemberships, lockedMembership, today)) {
        return { error: "A later active membership already exists for this course.", status: 409 };
      }

      const dates = getRenewalDates({
        oldEndDate: lockedMembership.endDate,
        durationMonths,
        today,
      });
      const newMembership = await Membership.create({
        clientId: lockedMembership.clientId,
        courseId: lockedMembership.courseId,
        ...dates,
        totalAmount: coursePlan.price,
        status: "pending_payment",
      }, { transaction });
      return { membership: newMembership, dueAmount: Number(coursePlan.price) };
    });
    if (renewedMembership.error) {
      return res.status(renewedMembership.status).json({
        status: "error",
        message: renewedMembership.error,
      });
    }
    return res.status(201).json({
      status: "success",
      data: {
        ...renewedMembership.membership.toJSON(),
        paymentStatus: "unpaid",
        dueAmount: renewedMembership.dueAmount,
      },
    });
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
