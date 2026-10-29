import { Op } from "sequelize";
import { Client, Course, DietPlan, DietPlanReview, ProgressEntry } from "../models/index.js";
import { computeDietTargets, IncompleteProfileError } from "../services/dietTargets.js";
import {
  buildDietPrompt,
  buildTweakPrompt,
  GeminiConfigError,
  generateValidatedPlan,
} from "../services/gemini.js";
import { canAccessClient } from "../utils/access.js";
import { todayInGymTz } from "../utils/dates.js";
import { getPagination, paginatedData } from "../utils/pagination.js";

function generationErrorResponse(res, error) {
  if (error instanceof IncompleteProfileError) {
    return res.status(409).json({ status: "error", message: `${error.message} Update the client profile first.` });
  }
  if (error instanceof GeminiConfigError) {
    console.error("Diet plan generation is not configured:", error.message);
    return res.status(503).json({ status: "error", message: "Diet generation is not configured." });
  }
  console.error("Diet plan generation failed:", error.message);
  return res.status(502).json({ status: "error", message: "Unable to generate a valid diet plan. Please try again." });
}

async function requireTrainerCourse(user, course) {
  const assignedTrainers = await course.getTrainers({ where: { userId: user.id }, attributes: ["userId"] });
  return assignedTrainers.length > 0;
}

function targetsFor(client, course) {
  return computeDietTargets({
    dateOfBirth: client.dateOfBirth,
    gender: client.gender,
    heightCm: client.heightCm,
    weightKg: client.weightKg,
    goalCategory: client.goalCategory,
    course,
    today: todayInGymTz(),
  });
}

export async function generateDietPlan(req, res) {
  try {
    const value = req.validated.body;
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(req.params.id);
    const course = value.courseId ? await Course.findByPk(value.courseId) : null;
    if (value.courseId && (!course || !course.active)) {
      return res.status(404).json({ status: "error", message: "Course not found." });
    }
    if (course && !(await requireTrainerCourse(req.user, course))) {
      return res.status(403).json({ status: "error", message: "This course is not assigned to you." });
    }
    let plan;
    let targets;
    try {
      targets = targetsFor(client, course);
      // The free-text goal is passed only as a delimited, length-limited note.
      plan = await generateValidatedPlan(buildDietPrompt({ profile: client, targets, note: client.goal }), targets.dailyCalories);
    } catch (error) {
      return generationErrorResponse(res, error);
    }
    const dietPlan = await DietPlan.create({
      clientId: client.userId,
      trainerId: req.user.id,
      courseId: course?.id ?? null,
      plan: { ...plan, targets },
      status: "draft",
    });
    return res.status(201).json({ status: "success", data: dietPlan });
  } catch (error) {
    console.error("Diet plan creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create diet plan." });
  }
}

export async function suggestDietPlanTweak(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(req.params.id);
    const currentPlan = await DietPlan.findOne({
      where: { id: req.params.planId, clientId: client.userId, trainerId: req.user.id },
      include: [Course],
    });
    if (!currentPlan) return res.status(404).json({ status: "error", message: "Diet plan not found." });
    const progress = await ProgressEntry.findAll({
      where: { clientId: client.id, recordedAt: { [Op.gte]: new Date(Date.now() - 28 * 86400000) } },
      order: [["recordedAt", "ASC"]],
    });
    if (!progress.length) {
      return res.status(409).json({ status: "error", message: "Log at least one progress entry in the last four weeks first." });
    }
    let plan;
    let targets;
    try {
      targets = targetsFor(client, currentPlan.Course);
      const { targets: _previousTargets, ...planBody } = currentPlan.plan ?? {};
      plan = await generateValidatedPlan(
        buildTweakPrompt({ profile: client, targets, currentPlan: planBody, progress }),
        targets.dailyCalories,
      );
    } catch (error) {
      return generationErrorResponse(res, error);
    }
    const draft = await DietPlan.create({
      clientId: client.userId,
      trainerId: req.user.id,
      courseId: currentPlan.courseId,
      plan: { ...plan, targets, basedOnPlanId: currentPlan.id },
      status: "draft",
    });
    return res.status(201).json({ status: "success", data: draft });
  } catch (error) {
    console.error("Diet plan tweak failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to suggest a diet plan tweak." });
  }
}

export async function createProgressEntry(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const value = req.validated.body;
    const entry = await ProgressEntry.create({
      clientId: req.params.id,
      weightKg: value.weightKg ?? null,
      stamina: value.stamina ?? null,
      staminaNotes: value.note || null,
    });
    return res.status(201).json({ status: "success", data: entry });
  } catch (error) {
    console.error("Progress entry creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to save progress." });
  }
}

export async function listProgressEntries(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const pagination = getPagination(req.validated.query);
    const { rows, count } = await ProgressEntry.findAndCountAll({
      where: { clientId: req.params.id },
      order: [["recordedAt", "DESC"]],
      ...(pagination ? { limit: pagination.limit, offset: pagination.offset } : { limit: 52 }),
    });
    return res.json({ status: "success", data: paginatedData(rows, count, pagination) });
  } catch (error) {
    console.error("Progress list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve progress." });
  }
}

export async function listClientDietPlans(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ status: "error", message: "Client not found." });
    const where = { clientId: client.userId };
    if (req.user.role === "client") where.status = "approved";
    if (req.user.role === "trainer") where.trainerId = req.user.id;
    const plans = await DietPlan.findAll({ where, order: [["createdAt", "DESC"]] });
    return res.json({ status: "success", data: plans });
  } catch (error) {
    console.error("Diet plan list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve diet plans." });
  }
}

// Diet plans store the client's user id; the plan's author must still be the client's current trainer.
async function canAccessPlanClient(user, plan) {
  const client = await Client.findOne({ where: { userId: plan.clientId }, attributes: ["id"] });
  return Boolean(client && await canAccessClient(user, client.id));
}

export async function updateDietPlan(req, res) {
  try {
    const value = req.validated.body;
    const plan = await DietPlan.findOne({
      where: { id: req.params.planId, trainerId: req.user.id, status: "draft" },
    });
    if (!plan || !(await canAccessPlanClient(req.user, plan))) return res.status(404).json({ status: "error", message: "Draft diet plan not found." });
    await plan.update({ plan: value.plan });
    return res.json({ status: "success", data: plan });
  } catch (error) {
    console.error("Diet plan update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update diet plan." });
  }
}

export async function approveDietPlan(req, res) {
  try {
    const plan = await DietPlan.findOne({
      where: { id: req.params.planId, trainerId: req.user.id, status: "draft" },
    });
    if (!plan || !(await canAccessPlanClient(req.user, plan))) {
      return res.status(404).json({ status: "error", message: "Draft diet plan not found." });
    }
    await plan.update({ status: "approved", reviewedAt: new Date() });
    await DietPlanReview.upsert({ dietPlanId: plan.id, reviewedBy: req.user.id });
    return res.json({ status: "success", data: plan });
  } catch (error) {
    console.error("Diet plan approval failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to approve diet plan." });
  }
}
