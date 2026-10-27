import { Client, Course, DietPlan, DietPlanReview } from "../models/index.js";
import { canAccessClient } from "../utils/access.js";

async function generateGeminiPlan(client, course) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a general wellness diet plan as valid JSON for review by a qualified trainer. Do not make medical claims. Client goal: ${client.goal ?? "not provided"}. Course: ${course?.name ?? "general fitness"}. Include meals and hydration guidance.`,
          }],
        }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}.`);
  }
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no diet plan.");
  return JSON.parse(text);
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
    if (course) {
      const assignedTrainers = await course.getTrainers({
        where: { userId: req.user.id },
        attributes: ["userId"],
      });
      if (!assignedTrainers.length) {
        return res.status(403).json({ status: "error", message: "This course is not assigned to you." });
      }
    }
    let plan;
    try {
      plan = await generateGeminiPlan(client, course);
    } catch (error) {
      console.error("Diet plan generation failed:", error);
      return res.status(error.message === "GEMINI_API_KEY is not configured." ? 503 : 502).json({
        status: "error",
        message: error.message === "GEMINI_API_KEY is not configured."
          ? "Diet generation is not configured."
          : "Unable to generate a diet plan.",
      });
    }
    const dietPlan = await DietPlan.create({
      clientId: client.userId,
      trainerId: req.user.id,
      courseId: course?.id ?? null,
      plan,
      status: "draft",
    });
    return res.status(201).json({ status: "success", data: dietPlan });
  } catch (error) {
    console.error("Diet plan creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create diet plan." });
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

export async function updateDietPlan(req, res) {
  try {
    const value = req.validated.body;
    const plan = await DietPlan.findOne({
      where: { id: req.params.planId, trainerId: req.user.id, status: "draft" },
    });
    if (!plan) return res.status(404).json({ status: "error", message: "Draft diet plan not found." });
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
    if (!plan) return res.status(404).json({ status: "error", message: "Draft diet plan not found." });
    await plan.update({ status: "approved", reviewedAt: new Date() });
    await DietPlanReview.upsert({ dietPlanId: plan.id, reviewedBy: req.user.id });
    return res.json({ status: "success", data: plan });
  } catch (error) {
    console.error("Diet plan approval failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to approve diet plan." });
  }
}
