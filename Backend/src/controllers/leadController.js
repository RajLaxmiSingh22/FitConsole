import { Op, QueryTypes, Sequelize } from "sequelize";
import { randomUUID } from "node:crypto";
import { sequelize } from "../database.js";
import { AnalyticsEvent, Client, Course, CoursePlan, LeadActivity, Member, Membership, User, UserStatus, WebsiteLead } from "../models/index.js";
import { canTransitionLead, normalizeIndianMobile } from "../utils/leadWorkflow.js";
import { addMembershipMonths } from "../utils/membershipDates.js";
import { getExistingPendingMembership } from "../utils/pendingMembership.js";
import { todayInGymTz } from "../utils/dates.js";
import { escapeLikePattern } from "../utils/pagination.js";

const configuredDuplicateWindowHours = Number(process.env.TRIAL_BOOKING_DUPLICATE_WINDOW_HOURS ?? 24);
const duplicateWindowHours = Number.isFinite(configuredDuplicateWindowHours) && configuredDuplicateWindowHours > 0
  ? configuredDuplicateWindowHours
  : 24;
const duplicateWindowMs = duplicateWindowHours * 60 * 60 * 1000;

function sourcePath(value) {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") && !/[?#]/.test(value)
    ? value
    : null;
}

function eventFromLead(lead, type, transaction) {
  return AnalyticsEvent.create({
    eventId: randomUUID(),
    type,
    page: "/book-free-trial",
    source: lead.source,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    leadId: lead.id,
  }, { transaction });
}

export async function createTrialBooking(req, res) {
  const value = req.validated.body;
  const normalizedPhone = normalizeIndianMobile(value.phone);
  if (!normalizedPhone) {
    return res.status(400).json({ status: "error", message: "Enter a valid Indian mobile number." });
  }

  try {
    if (!value.consent) {
      return res.status(400).json({ status: "error", message: "Consent is required to receive a trial booking request." });
    }
    const course = value.courseId
      ? await Course.findOne({ where: { id: value.courseId, active: true } })
      : null;
    if (value.courseId && !course) {
      return res.status(400).json({ status: "error", message: "Select an available course." });
    }

    const created = await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        "SELECT pg_advisory_xact_lock(hashtext(:phone))",
        { replacements: { phone: normalizedPhone }, transaction },
      );
      const recent = await WebsiteLead.findOne({
        where: {
          normalizedPhone,
          createdAt: { [Op.gte]: new Date(Date.now() - duplicateWindowMs) },
        },
        attributes: ["id"],
        transaction,
      });
      if (recent) return null;

      const lead = await WebsiteLead.create({
        name: value.name,
        phone: value.phone,
        normalizedPhone,
        email: value.email || null,
        courseId: course?.id ?? null,
        preferredDate: value.preferredDate ?? null,
        preferredSlot: value.preferredSlot || null,
        message: value.message || null,
        consent: true,
        source: "website",
        landingPage: sourcePath(value.landingPage),
        utmSource: value.utmSource || null,
        utmMedium: value.utmMedium || null,
        utmCampaign: value.utmCampaign || null,
      }, { transaction });
      await LeadActivity.create({
        leadId: lead.id,
        type: "note",
        description: "Trial booking request received. Appointment is not confirmed.",
      }, { transaction });
      await AnalyticsEvent.create({
        eventId: randomUUID(),
        type: "trial_booking",
        page: "/book-free-trial",
        source: "website",
        utmSource: lead.utmSource,
        utmMedium: lead.utmMedium,
        utmCampaign: lead.utmCampaign,
        leadId: lead.id,
      }, { transaction });
      return lead;
    });

    if (!created) {
      return res.status(409).json({
        status: "error",
        message: `A request was already received for this phone number in the last ${duplicateWindowHours} hours.`,
      });
    }
    return res.status(201).json({
      status: "success",
      data: { id: created.id, status: created.status, message: "Request received, not confirmed yet." },
    });
  } catch (error) {
    console.error("Trial booking failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to receive your request." });
  }
}

export async function listLeads(req, res) {
  try {
    const value = req.validated.query;
    const where = {};
    if (value.status) where.status = value.status;
    if (value.courseId) where.courseId = value.courseId;
    if (value.from || value.to) {
      where.createdAt = {};
      if (value.from) where.createdAt[Op.gte] = value.from;
      if (value.to) {
        const to = new Date(value.to);
        to.setUTCHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = to;
      }
    }
    if (value.search) {
      const pattern = `%${escapeLikePattern(value.search)}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: pattern } },
        { email: { [Op.iLike]: pattern } },
        { phone: { [Op.iLike]: pattern } },
      ];
    }

    const [result, counts] = await Promise.all([
      WebsiteLead.findAndCountAll({
        where,
        include: [{ model: Course, attributes: ["id", "name"] }],
        order: [[value.sort, value.order.toUpperCase()]],
        limit: value.limit,
        offset: (value.page - 1) * value.limit,
        distinct: true,
      }),
      WebsiteLead.findAll({
        attributes: ["status", [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]],
        group: ["status"],
        raw: true,
      }),
    ]);
    return res.json({
      status: "success",
      data: {
        leads: result.rows,
        pagination: {
          page: value.page,
          limit: value.limit,
          total: result.count,
          totalPages: Math.ceil(result.count / value.limit),
        },
        counts: Object.fromEntries(counts.map(({ status, count }) => [status, Number(count)])),
      },
    });
  } catch (error) {
    console.error("Website lead list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve website leads." });
  }
}

export async function getLead(req, res) {
  try {
    const lead = await WebsiteLead.findByPk(req.params.id, {
      include: [
        { model: Course, attributes: ["id", "name"] },
        {
          model: LeadActivity,
          separate: true,
          order: [["createdAt", "DESC"]],
          include: [{ model: User, attributes: ["id", "fullName"] }],
        },
        { model: Client, include: [{ model: User, attributes: ["id", "fullName", "email"] }] },
      ],
    });
    if (!lead) return res.status(404).json({ status: "error", message: "Lead not found." });
    return res.json({ status: "success", data: lead });
  } catch (error) {
    console.error("Website lead lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve website lead." });
  }
}

export async function updateLeadStatus(req, res) {
  const value = req.validated.body;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const lead = await WebsiteLead.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lead) return { status: 404, message: "Lead not found." };
      if (value.status === "enrolled") {
        return { status: 409, message: "Use the enrollment workflow to convert this lead." };
      }
      if (!canTransitionLead(lead.status, value.status)) {
        return { status: 409, message: `Lead cannot move from ${lead.status} to ${value.status}.` };
      }

      const previousStatus = lead.status;
      const trialAttendedAt = value.status === "trial_attended" ? new Date() : lead.trialAttendedAt;
      await lead.update({ status: value.status, trialAttendedAt }, { transaction });
      await LeadActivity.create({
        leadId: lead.id,
        userId: req.user.id,
        type: value.status === "trial_attended" ? "trial_attendance" : "status_change",
        description: value.note || `Status changed from ${previousStatus} to ${value.status}.`,
        previousStatus,
        newStatus: value.status,
      }, { transaction });
      if (value.status === "trial_attended") {
        await eventFromLead(lead, "trial_attendance", transaction);
      }
      return { status: 200, lead };
    });
    if (result.status !== 200) {
      return res.status(result.status).json({ status: "error", message: result.message });
    }
    return res.json({ status: "success", data: result.lead });
  } catch (error) {
    console.error("Website lead status update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update lead status." });
  }
}

export async function addLeadNote(req, res) {
  try {
    const lead = await WebsiteLead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ status: "error", message: "Lead not found." });
    const activity = await LeadActivity.create({
      leadId: lead.id,
      userId: req.user.id,
      type: "note",
      description: req.validated.body.note,
    });
    return res.status(201).json({ status: "success", data: activity });
  } catch (error) {
    console.error("Website lead note failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to add lead note." });
  }
}

export async function assignLeadCourse(req, res) {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const lead = await WebsiteLead.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lead) return { status: 404, message: "Lead not found." };
      if (lead.status === "enrolled") {
        return { status: 409, message: "An enrolled lead's course cannot be changed." };
      }

      const course = await Course.findOne({
        where: { id: req.validated.body.courseId, active: true },
        transaction,
      });
      if (!course) return { status: 404, message: "Active course not found." };
      if (lead.courseId === course.id) return { status: 200, lead };

      await lead.update({ courseId: course.id }, { transaction });
      await LeadActivity.create({
        leadId: lead.id,
        userId: req.user.id,
        type: "note",
        description: `Assigned to the ${course.name} course.`,
      }, { transaction });
      return { status: 200, lead };
    });
    if (result.status !== 200) {
      return res.status(result.status).json({ status: "error", message: result.message });
    }
    return res.json({ status: "success", data: result.lead });
  } catch (error) {
    console.error("Website lead course assignment failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to assign a course to this lead." });
  }
}

export async function enrollLead(req, res) {
  const value = req.validated.body;
  try {
    const response = await sequelize.transaction(async (transaction) => {
      const lead = await WebsiteLead.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!lead) return { status: 404, message: "Lead not found." };
      if (lead.status !== "trial_attended") {
        return { status: 409, message: "Only leads with recorded trial attendance can be enrolled." };
      }
      if (!lead.courseId) return { status: 409, message: "Assign an active course to this lead before enrollment." };

      const plan = await CoursePlan.findOne({
        where: { courseId: lead.courseId, durationMonths: value.durationMonths },
        include: [{ model: Course, where: { active: true } }],
        transaction,
      });
      if (!plan) return { status: 409, message: "A current price plan is not available for the selected duration." };

      const matches = await sequelize.query(
        `SELECT c.id AS "clientId", c.user_id AS "userId", u.email
         FROM clients c JOIN users u ON u.id = c.user_id
         WHERE lower(u.email) = lower(:email)
            OR right(regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g'), 10) = :phone
         FOR UPDATE`,
        {
          replacements: { email: lead.email || "", phone: lead.normalizedPhone },
          type: QueryTypes.SELECT,
          transaction,
        },
      );
      const uniqueUsers = [...new Map(matches.map((row) => [row.userId, row])).values()];
      if (uniqueUsers.length > 1) {
        return { status: 409, message: "The lead phone and email match different member accounts. Resolve the profile before enrollment." };
      }
      const matched = uniqueUsers[0];
      if (!matched) {
        return { status: 409, message: "Ask this lead to create a member account using the same phone or email before enrollment." };
      }
      const [user, accountStatus] = await Promise.all([
        User.findByPk(matched.userId, { transaction, lock: transaction.LOCK.UPDATE }),
        UserStatus.findByPk(matched.userId, { transaction }),
      ]);
      if (!user || user.role !== "client" || accountStatus?.active === false) {
        return { status: 409, message: "The matching account is not an eligible member account." };
      }
      const client = await Client.findByPk(matched.clientId, { transaction, lock: transaction.LOCK.UPDATE });
      const member = await Member.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!client || !member) {
        return { status: 409, message: "The matching account has an incomplete member profile." };
      }

      const today = todayInGymTz();
      const existingMembership = await Membership.findOne({
        where: {
          clientId: member.userId,
          courseId: lead.courseId,
          status: "active",
          endDate: { [Op.gte]: today },
        },
        order: [["endDate", "DESC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existingMembership) {
        return { status: 409, message: "This member already has an active membership for the selected course." };
      }
      if (await getExistingPendingMembership(member.userId, transaction)) {
        return { status: 409, message: "This member already has a membership awaiting payment." };
      }

      const startDate = today;
      const membership = await Membership.create({
        clientId: member.userId,
        courseId: lead.courseId,
        startDate,
        endDate: addMembershipMonths(startDate, value.durationMonths),
        totalAmount: plan.price,
        status: "pending_payment",
      }, { transaction });
      const previousStatus = lead.status;
      await lead.update({ clientId: client.id, status: "enrolled" }, { transaction });
      await LeadActivity.create({
        leadId: lead.id,
        userId: req.user.id,
        type: "enrollment",
        description: `Enrolled in ${plan.Course.name} for ${value.durationMonths} months. Payment remains unpaid until recorded.`,
        previousStatus,
        newStatus: "enrolled",
      }, { transaction });
      await eventFromLead(lead, "enrollment", transaction);
      return { status: 201, data: { lead, membership, paymentStatus: "unpaid" } };
    });

    if (response.status !== 201) {
      return res.status(response.status).json({ status: "error", message: response.message });
    }
    return res.status(201).json({ status: "success", data: response.data });
  } catch (error) {
    console.error("Website lead enrollment failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to enroll this lead." });
  }
}
