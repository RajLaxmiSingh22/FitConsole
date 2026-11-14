import { destroyMediaQuietly, isCloudinaryConfigured, uploadCourseCover } from "../services/cloudinary.js";
import { detectImageType } from "./profileController.js";
import { sequelize } from "../database.js";
import { Course, CoursePlan, Trainer, TrainerDetails, User, UserStatus } from "../models/index.js";

const courseIncludes = [{ model: CoursePlan }, {
  model: Trainer,
  include: [
    { model: User, attributes: ["id", "fullName"] },
    { model: TrainerDetails, attributes: ["userId", "experienceYears"] },
  ],
  attributes: ["userId", "certification"],
}];

export async function listCourses(_req, res) {
  try {
    const courses = await Course.findAll({
      where: { active: true },
      include: courseIncludes,
      order: [["name", "ASC"]],
    });
    return res.json({ status: "success", data: courses });
  } catch (error) {
    console.error("Course list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve courses." });
  }
}

export async function getCourse(req, res) {
  try {
    const course = await Course.findByPk(req.params.id, { include: courseIncludes });
    if (!course || !course.active) {
      return res.status(404).json({ status: "error", message: "Course not found." });
    }
    return res.json({ status: "success", data: course });
  } catch (error) {
    console.error("Course lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve course." });
  }
}

export async function createCourse(req, res) {
  const value = req.validated.body;
  try {
    const [defaultPlan] = value.plans;
    const courseId = await sequelize.transaction(async (transaction) => {
      const course = await Course.create({
        name: value.name,
        category: value.category,
        description: value.description,
        minAge: value.minAge ?? null,
        maxAge: value.maxAge ?? null,
        level: value.level ?? null,
        price: defaultPlan.price,
      }, { transaction });
      await CoursePlan.bulkCreate(value.plans.map((plan) => ({ ...plan, courseId: course.id })), { transaction });
      return course.id;
    });
    const created = await Course.findByPk(courseId, { include: [CoursePlan] });
    return res.status(201).json({ status: "success", data: created });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ status: "error", message: "A course with this name already exists." });
    }
    console.error("Course creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create course." });
  }
}

export async function updateCourse(req, res) {
  const value = req.validated.body;
  try {
    const courseId = await sequelize.transaction(async (transaction) => {
      const course = await Course.findByPk(req.params.id, { transaction });
      if (!course) return null;
      const { plans, ...fields } = value;
      if (plans) {
        await CoursePlan.destroy({ where: { courseId: course.id }, transaction });
        await CoursePlan.bulkCreate(plans.map((plan) => ({ ...plan, courseId: course.id })), { transaction });
        fields.price = plans[0].price;
      }
      await course.update(fields, { transaction });
      return course.id;
    });
    if (!courseId) return res.status(404).json({ status: "error", message: "Course not found." });
    return res.json({ status: "success", data: await Course.findByPk(courseId, { include: [CoursePlan] }) });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ status: "error", message: "A course with this name already exists." });
    }
    console.error("Course update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update course." });
  }
}

export const COURSE_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COURSE_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Checks the declared type against the file's own signature and the size limit.
export function checkCourseCover(buffer, declaredType) {
  const declared = declaredType?.split(";")[0].trim().toLowerCase();
  if (!COURSE_COVER_TYPES.includes(declared) || detectImageType(buffer) !== declared) {
    return { status: 400, message: "Upload a JPEG, PNG or WebP image." };
  }
  if (buffer.length > COURSE_COVER_MAX_BYTES) return { status: 413, message: "Image is too large (5 MB maximum)." };
  return null;
}

export async function uploadCourseCoverImage(req, res) {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ status: "error", message: "Media storage (Cloudinary) is not configured on the server." });
  }
  const problem = checkCourseCover(req.body, req.headers["content-type"]);
  if (problem) return res.status(problem.status).json({ status: "error", message: problem.message });
  let uploaded;
  try {
    const course = await Course.findByPk(req.validated.params.id);
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });
    const previous = course.coverImagePublicId;
    uploaded = await uploadCourseCover({ buffer: req.body, mimeType: req.headers["content-type"].split(";")[0].trim(), courseId: course.id });
    const alt = req.validated.query.alt;
    await course.update({ coverImageUrl: uploaded.url, coverImagePublicId: uploaded.publicId, ...(alt !== undefined ? { coverImageAlt: alt || null } : {}) });
    if (previous) destroyMediaQuietly(previous);
    return res.json({ status: "success", data: course });
  } catch (error) {
    console.error("Course cover upload failed:", error);
    if (uploaded) destroyMediaQuietly(uploaded.publicId);
    return res.status(502).json({ status: "error", message: "Unable to upload the cover image. Try again." });
  }
}

export async function removeCourseCoverImage(req, res) {
  try {
    const course = await Course.findByPk(req.validated.params.id);
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });
    const previous = course.coverImagePublicId;
    await course.update({ coverImageUrl: null, coverImagePublicId: null });
    if (previous) destroyMediaQuietly(previous);
    return res.json({ status: "success", data: course });
  } catch (error) {
    console.error("Course cover removal failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to remove the cover image." });
  }
}

export async function deleteCourse(req, res) {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ status: "error", message: "Course not found." });
    }
    await course.update({ active: false });
    return res.json({ status: "success", message: "Course deactivated." });
  } catch (error) {
    console.error("Course deactivation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to deactivate course." });
  }
}

export async function setCourseTrainers(req, res) {
  try {
    const value = req.validated.body;
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ status: "error", message: "Course not found." });
    }
    const [trainers, statuses] = await Promise.all([
      Trainer.findAll({ where: { userId: value.trainerIds } }),
      UserStatus.findAll({
        where: { userId: value.trainerIds, active: false },
      }),
    ]);
    if (trainers.length !== value.trainerIds.length || statuses.length) {
      return res.status(400).json({ status: "error", message: "One or more trainer IDs are invalid or inactive." });
    }
    await course.setTrainers(trainers);
    return res.json({ status: "success", data: await Course.findByPk(course.id, { include: courseIncludes }) });
  } catch (error) {
    console.error("Course trainer update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update course trainers." });
  }
}
