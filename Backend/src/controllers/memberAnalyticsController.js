import { Attendance, Client, Trainer, TrainerNote, User, WellnessCheckin } from "../models/index.js";
import { gymOverview, memberAnalytics, memberCalendar, memberTable } from "../services/memberAnalytics.js";
import { canAccessClient } from "../utils/access.js";
import { todayInGymTz } from "../utils/dates.js";

// Same access rule everywhere: a client sees themselves, a trainer their assigned clients, the owner everyone.
async function accessibleClient(req, res) {
  if (!(await canAccessClient(req.user, req.params.id))) {
    res.status(404).json({ status: "error", message: "Client not found." });
    return null;
  }
  const client = await Client.findByPk(req.params.id, { include: [{ model: User, attributes: ["id", "fullName"] }] });
  if (!client) res.status(404).json({ status: "error", message: "Client not found." });
  return client;
}

export async function getMemberAnalytics(req, res) {
  try {
    const client = await accessibleClient(req, res);
    if (!client) return undefined;
    const data = await memberAnalytics(client, { viewer: req.user, rangeDays: req.validated.query.range });
    return res.json({ status: "success", data: { client: { id: client.id, name: client.User?.fullName ?? "Member" }, ...data } });
  } catch (error) {
    console.error("Member analytics failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load analytics." });
  }
}

export async function getMemberCalendar(req, res) {
  try {
    const client = await accessibleClient(req, res);
    if (!client) return undefined;
    return res.json({ status: "success", data: await memberCalendar(client, { month: req.validated.query.month }) });
  } catch (error) {
    console.error("Attendance calendar failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load the attendance calendar." });
  }
}

// Clients record their own wellness, once per gym day (saving again updates today's entry).
export async function saveWellnessCheckin(req, res) {
  try {
    const client = await accessibleClient(req, res);
    if (!client) return undefined;
    if (client.userId !== req.user.id) {
      return res.status(403).json({ status: "error", message: "Only the member can record their wellness check-in." });
    }
    const value = req.validated.body;
    const recordedOn = todayInGymTz();
    const fields = { ...value, problem: value.pain ? value.problem || null : null, notes: value.notes || null };
    const [checkin, created] = await WellnessCheckin.findOrCreate({ where: { clientId: client.id, recordedOn }, defaults: { clientId: client.id, recordedOn, ...fields } });
    if (!created) await checkin.update(fields);
    return res.status(created ? 201 : 200).json({ status: "success", data: checkin });
  } catch (error) {
    console.error("Wellness check-in failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to save your check-in." });
  }
}

export async function createTrainerNote(req, res) {
  try {
    const client = await accessibleClient(req, res);
    if (!client) return undefined;
    const note = await TrainerNote.create({ clientId: client.id, authorId: req.user.id, ...req.validated.body });
    return res.status(201).json({ status: "success", data: { id: note.id, kind: note.kind, body: note.body, author: req.user.fullName, createdAt: note.createdAt } });
  } catch (error) {
    console.error("Trainer note failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to save the note." });
  }
}

// Front desk: records when a member leaves (once, on the day of the visit).
export async function checkOut(req, res) {
  try {
    const visit = await Attendance.findByPk(req.params.id);
    const client = visit && await Client.findOne({ where: { userId: visit.clientId }, attributes: ["id"] });
    if (!visit || !client || !(await canAccessClient(req.user, client.id))) {
      return res.status(404).json({ status: "error", message: "Check-in not found." });
    }
    if (visit.checkedOutAt) return res.status(409).json({ status: "error", message: "This member is already checked out." });
    if (visit.attendedOn !== todayInGymTz()) return res.status(409).json({ status: "error", message: "Check-outs can only be recorded on the day of the visit." });
    await visit.update({ checkedOutAt: new Date() });
    return res.json({ status: "success", data: { id: visit.id, checkedOutAt: visit.checkedOutAt } });
  } catch (error) {
    console.error("Check-out failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to check out." });
  }
}

// Owner: every member. Trainer: only their assigned members.
async function visibleClients(user) {
  const where = {};
  if (user.role === "trainer") {
    const trainer = await Trainer.findByPk(user.id, { attributes: ["id"] });
    where.trainerId = trainer?.id ?? null;
  }
  return Client.findAll({
    where,
    attributes: ["id", "userId", "trainerId", "weightKg", "trainingDays"],
    include: [{ model: User, attributes: ["id", "fullName"] }, { model: Trainer, attributes: ["id", "userId"], include: [{ model: User, attributes: ["fullName"] }] }],
    order: [[User, "fullName", "ASC"]],
  });
}

export async function listMemberAnalytics(req, res) {
  try {
    return res.json({ status: "success", data: await memberTable(await visibleClients(req.user)) });
  } catch (error) {
    console.error("Member analytics table failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load member analytics." });
  }
}

export async function getGymOverview(req, res) {
  try {
    const { from, to } = req.validated.query;
    const data = await gymOverview(await visibleClients(req.user), { from, to });
    return res.json({ status: "success", data });
  } catch (error) {
    console.error("Gym overview failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load the gym overview." });
  }
}
