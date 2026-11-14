import { destroyMediaQuietly, isCloudinaryConfigured, signDirectUpload, verifyDirectUpload } from "../services/cloudinary.js";
import { sequelize } from "../database.js";
import { Course, CoursePlan, Trainer, TrainerDetails, User, UserAvatar, UserStatus } from "../models/index.js";

const courseIncludes = [{ model: CoursePlan }, {
  model: Trainer,
  include: [
    // The photo version lets course cards show coach photos (coach avatars are public).
    { model: User, attributes: ["id", "fullName"], include: [{ model: UserAvatar, attributes: ["userId", "updatedAt"] }] },
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

// First check of a planned cover upload from what the browser declares; Cloudinary's allowed_formats and
// the lookup after upload (verifyDirectUpload) check the real file.
export function checkCourseCover(mimeType, bytes) {
  if (!COURSE_COVER_TYPES.includes(String(mimeType ?? "").toLowerCase())) return { status: 400, message: "Upload a JPEG, PNG or WebP image." };
  if (!(bytes > 0) || bytes > COURSE_COVER_MAX_BYTES) return { status: 413, message: "Image is too large (5 MB maximum)." };
  return null;
}

const coverStorageOff = (res) => res.status(503).json({ status: "error", message: "Media storage (Cloudinary) is not configured on the server." });

// Step 1: sign one direct browser upload into this course's cover folder.
export async function signCourseCoverUpload(req, res) {
  if (!isCloudinaryConfigured()) return coverStorageOff(res);
  const problem = checkCourseCover(req.validated.body.mimeType, req.validated.body.bytes);
  if (problem) return res.status(problem.status).json({ status: "error", message: problem.message });
  try {
    const course = await Course.findByPk(req.validated.params.id, { attributes: ["id"] });
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });
    return res.json({ status: "success", data: signDirectUpload({ kind: "course-cover", courseId: course.id }) });
  } catch (error) {
    console.error("Course cover signing failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to prepare the upload." });
  }
}

// Step 2: check the uploaded asset in our Cloudinary account, then save it as the course cover.
export async function saveCourseCoverImage(req, res) {
  if (!isCloudinaryConfigured()) return coverStorageOff(res);
  const { publicId, alt } = req.validated.body;
  try {
    const course = await Course.findByPk(req.validated.params.id);
    if (!course) return res.status(404).json({ status: "error", message: "Course not found." });
    const checked = await verifyDirectUpload({ kind: "course-cover", courseId: course.id, publicId });
    if (checked.error) {
      if (checked.remove) destroyMediaQuietly(publicId);
      return res.status(checked.status).json({ status: "error", message: checked.error });
    }
    const previous = course.coverImagePublicId;
    await course.update({ coverImageUrl: checked.asset.url, coverImagePublicId: checked.asset.publicId, ...(alt !== undefined ? { coverImageAlt: alt || null } : {}) });
    if (previous && previous !== checked.asset.publicId) destroyMediaQuietly(previous);
    return res.json({ status: "success", data: course });
  } catch (error) {
    console.error("Course cover save failed:", error);
    return res.status(502).json({ status: "error", message: "Unable to check the upload with media storage. Try again." });
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
