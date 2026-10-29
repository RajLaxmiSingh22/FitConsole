import { Op } from "sequelize";
import { Attendance, Client, Course, Member, Membership, Trainer, User } from "../models/index.js";
import { canAccessClient } from "../utils/access.js";
import { todayInGymTz } from "../utils/dates.js";
import { isMembershipValidOnDate } from "../utils/membershipPayments.js";
import { hasAcceptedCurrentWaiver } from "../utils/waiver.js";
import { getPagination, paginatedData } from "../utils/pagination.js";

export async function checkIn(req, res) {
  try {
    const value = req.validated.body;
    const [client, course] = await Promise.all([
      Client.findByPk(value.clientId),
      Course.findByPk(value.courseId),
    ]);
    if (!client || !course || !course.active) {
      return res.status(404).json({ status: "error", message: "Client or active course not found." });
    }
    if (req.user.role === "trainer" && !(await canAccessClient(req.user, client.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    if (value.override && req.user.role !== "owner") {
      return res.status(403).json({ status: "error", message: "Only an owner can override membership requirements." });
    }
    if (req.user.role === "trainer") {
      const trainer = await Trainer.findByPk(req.user.id);
      const assignedCourses = trainer ? await trainer.getCourses({ attributes: ["id"] }) : [];
      if (!assignedCourses.some((assignedCourse) => assignedCourse.id === course.id)) {
        return res.status(403).json({ status: "error", message: "You are not assigned to this course." });
      }
    }
    if (!(await hasAcceptedCurrentWaiver(client.id))) {
      return res.status(403).json({
        status: "error",
        message: "Accept the current training waiver first.",
        code: "WAIVER_REQUIRED",
      });
    }
    const attendedOn = todayInGymTz();
    const activeMemberships = value.override ? [] : await Membership.findAll({
      where: {
        clientId: client.userId,
        courseId: course.id,
        status: "active",
      },
      attributes: ["id", "status", "startDate", "endDate"],
    });
    const membership = activeMemberships.find((item) => isMembershipValidOnDate(item, attendedOn));
    if (!membership && !value.override) {
      return res.status(409).json({
        status: "error",
        message: "No active membership for this course",
      });
    }
    const attendance = await Attendance.create({
      clientId: client.userId,
      courseId: course.id,
      trainerId: req.user.role === "trainer" ? req.user.id : null,
      attendedOn,
      override: Boolean(value.override),
      overrideReason: value.override ? value.reason : null,
    });
    return res.status(201).json({ status: "success", data: attendance });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError" || error.original?.code === "23505") {
      return res.status(409).json({ status: "error", message: "This client has already checked in for this course today." });
    }
    console.error("Attendance check-in failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to check in client." });
  }
}

export async function listAttendance(req, res) {
  try {
    const value = req.validated.query;
    const where = {};
    if (value.date) {
      const date = value.date.toISOString().slice(0, 10);
      where.attendedOn = date;
    }
    const include = [
      { model: Member, include: [{ model: User, attributes: ["id", "fullName"] }] },
      Course,
    ];
    if (req.user.role === "trainer") {
      const trainer = await Trainer.findByPk(req.user.id, { attributes: ["id"] });
      if (!trainer) return res.status(404).json({ status: "error", message: "Trainer profile not found." });
      const assignedClients = await Client.findAll({
        where: { trainerId: trainer.id },
        attributes: ["userId"],
        raw: true,
      });
      include[0].where = { userId: { [Op.in]: assignedClients.map((client) => client.userId) } };
    }
    const pagination = getPagination(value);
    const { rows, count } = await Attendance.findAndCountAll({
      where,
      include,
      distinct: true,
      order: [["attendedAt", "DESC"]],
      ...(pagination ? { limit: pagination.limit, offset: pagination.offset } : {}),
    });
    return res.json({ status: "success", data: paginatedData(rows, count, pagination) });
  } catch (error) {
    console.error("Attendance list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve attendance." });
  }
}

export async function listClientAttendance(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ status: "error", message: "Client not found." });
    const pagination = getPagination(req.validated.query);
    const { rows, count } = await Attendance.findAndCountAll({
      where: { clientId: client.userId },
      include: [Course, { model: Member, include: [{ model: User, attributes: ["id", "fullName"] }] }, { model: Trainer, include: [{ model: User, attributes: ["id", "fullName"] }] }],
      order: [["attendedAt", "DESC"]],
      ...(pagination ? { limit: pagination.limit, offset: pagination.offset } : {}),
    });
    return res.json({ status: "success", data: paginatedData(rows, count, pagination) });
  } catch (error) {
    console.error("Client attendance lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve client attendance." });
  }
}
