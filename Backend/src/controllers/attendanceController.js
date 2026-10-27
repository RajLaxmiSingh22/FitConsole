import { Op } from "sequelize";
import { Attendance, Client, Course, Member, Trainer, User } from "../models/index.js";
import { canAccessClient } from "../utils/access.js";

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
    const attendance = await Attendance.create({
      clientId: client.userId,
      courseId: course.id,
      trainerId: req.user.role === "trainer" ? req.user.id : null,
    });
    return res.status(201).json({ status: "success", data: attendance });
  } catch (error) {
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
      where.attendedAt = { [Op.gte]: `${date}T00:00:00.000Z`, [Op.lt]: `${date}T23:59:59.999Z` };
    }
    const include = [
      { model: Member, include: [{ model: User, attributes: ["id", "fullName"] }] },
      Course,
    ];
    if (req.user.role === "trainer") {
      include[0].where = { userId: { [Op.in]: await Client.findAll({ where: { trainerId: req.user.id }, attributes: ["userId"], raw: true }).then((rows) => rows.map((row) => row.userId)) } };
    }
    const records = await Attendance.findAll({
      where,
      include,
      order: [["attendedAt", "DESC"]],
    });
    return res.json({ status: "success", data: records });
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
    const records = await Attendance.findAll({
      where: { clientId: client.userId },
      include: [Course, { model: Member, include: [{ model: User, attributes: ["id", "fullName"] }] }, { model: Trainer, include: [{ model: User, attributes: ["id", "fullName"] }] }],
      order: [["attendedAt", "DESC"]],
    });
    return res.json({ status: "success", data: records });
  } catch (error) {
    console.error("Client attendance lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve client attendance." });
  }
}
