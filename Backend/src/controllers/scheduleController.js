import { Op } from "sequelize";
import { sequelize } from "../database.js";
import { ClassSession, Course, Trainer, User } from "../models/index.js";

const sessionInclude = [
  { model: Course, attributes: ["id", "name", "category", "active"] },
  { model: Trainer, attributes: ["userId"], include: [{ model: User, attributes: ["fullName"] }] },
];

// Public shape: HH:MM times and only the trainer's display name.
export function serializeSession(session) {
  return {
    id: session.id,
    weekday: session.weekday,
    startTime: String(session.startTime).slice(0, 5),
    endTime: String(session.endTime).slice(0, 5),
    level: session.level || null,
    active: session.active,
    course: session.Course ? { id: session.Course.id, name: session.Course.name, category: session.Course.category } : null,
    trainer: session.Trainer ? { id: session.Trainer.userId, name: session.Trainer.User?.fullName ?? "Trainer" } : null,
  };
}

// Two slots on the same day overlap when each starts before the other ends.
export function sessionsOverlap(left, right) {
  return left.weekday === right.weekday && left.startTime < right.endTime && right.startTime < left.endTime;
}

async function validateReferences(value, transaction) {
  if (value.courseId && !(await Course.findOne({ where: { id: value.courseId, active: true }, attributes: ["id"], transaction }))) {
    return "Choose an active course.";
  }
  if (value.trainerId && !(await Trainer.findByPk(value.trainerId, { attributes: ["userId"], transaction }))) {
    return "Choose an existing trainer.";
  }
  return null;
}

async function findTrainerClash(candidate, transaction, excludeId) {
  if (!candidate.trainerId || candidate.active === false) return null;
  const sameDay = await ClassSession.findAll({
    where: {
      trainerId: candidate.trainerId,
      weekday: candidate.weekday,
      active: true,
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
  });
  return sameDay.find((session) => sessionsOverlap(candidate, {
    weekday: session.weekday,
    startTime: String(session.startTime).slice(0, 5),
    endTime: String(session.endTime).slice(0, 5),
  })) ?? null;
}

// Public: the active weekly timetable for active courses.
export async function listPublicSchedule(_req, res) {
  try {
    const sessions = await ClassSession.findAll({
      where: { active: true },
      include: [{ ...sessionInclude[0], where: { active: true } }, sessionInclude[1]],
      order: [["weekday", "ASC"], ["startTime", "ASC"]],
    });
    return res.json({ status: "success", data: sessions.map(serializeSession) });
  } catch (error) {
    console.error("Public schedule lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load the class schedule." });
  }
}

// Owner: every slot, including paused ones.
export async function listAllSessions(_req, res) {
  try {
    const sessions = await ClassSession.findAll({ include: sessionInclude, order: [["weekday", "ASC"], ["startTime", "ASC"]] });
    return res.json({ status: "success", data: sessions.map(serializeSession) });
  } catch (error) {
    console.error("Schedule lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load the class schedule." });
  }
}

export async function createSession(req, res) {
  const value = req.validated.body;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const invalid = await validateReferences(value, transaction);
      if (invalid) return { status: 400, message: invalid };
      if (await findTrainerClash(value, transaction)) {
        return { status: 409, message: "This trainer already has a class at that time." };
      }
      const session = await ClassSession.create({ ...value, level: value.level || null }, { transaction });
      return { session: await ClassSession.findByPk(session.id, { include: sessionInclude, transaction }) };
    });
    if (!result.session) return res.status(result.status).json({ status: "error", message: result.message });
    return res.status(201).json({ status: "success", data: serializeSession(result.session) });
  } catch (error) {
    console.error("Class creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to add the class." });
  }
}

export async function updateSession(req, res) {
  const value = req.validated.body;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const session = await ClassSession.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!session) return { status: 404, message: "Class not found." };
      const next = {
        courseId: value.courseId ?? session.courseId,
        trainerId: value.trainerId === undefined ? session.trainerId : value.trainerId,
        weekday: value.weekday ?? session.weekday,
        startTime: value.startTime ?? String(session.startTime).slice(0, 5),
        endTime: value.endTime ?? String(session.endTime).slice(0, 5),
        active: value.active ?? session.active,
      };
      if (next.endTime <= next.startTime) return { status: 400, message: "End time must be after start time." };
      const invalid = await validateReferences(value, transaction);
      if (invalid) return { status: 400, message: invalid };
      if (await findTrainerClash(next, transaction, session.id)) {
        return { status: 409, message: "This trainer already has a class at that time." };
      }
      await session.update({ ...value, ...(value.level !== undefined ? { level: value.level || null } : {}) }, { transaction });
      return { session: await ClassSession.findByPk(session.id, { include: sessionInclude, transaction }) };
    });
    if (!result.session) return res.status(result.status).json({ status: "error", message: result.message });
    return res.json({ status: "success", data: serializeSession(result.session) });
  } catch (error) {
    console.error("Class update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update the class." });
  }
}

export async function deleteSession(req, res) {
  try {
    const deleted = await ClassSession.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ status: "error", message: "Class not found." });
    return res.json({ status: "success", data: { id: req.params.id } });
  } catch (error) {
    console.error("Class deletion failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to remove the class." });
  }
}
