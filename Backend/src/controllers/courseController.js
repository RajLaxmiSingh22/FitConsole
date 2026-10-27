import { sequelize } from "../database.js";
import { Course, CoursePlan, Trainer, TrainerDetails, User, UserStatus } from "../models/index.js";

const courseIncludes = [{ model: CoursePlan }, {
  model: Trainer,
  include: [
    { model: User, attributes: ["id", "fullName"] },
    TrainerDetails,
  ],
  attributes: ["userId", "certification", "phone"],
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
