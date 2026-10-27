import { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  setCourseTrainers,
  updateCourse,
} from "../controllers/courseController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { courseIdParamsSchema, createCourseSchema, setCourseTrainersSchema, updateCourseSchema } from "../validation/index.js";

const courseRoutes = Router();
courseRoutes.get("/", listCourses);
courseRoutes.get("/:id", validateRequest({ params: courseIdParamsSchema }), getCourse);
courseRoutes.post("/", requireAuthentication, requireRole("owner"), validateRequest({ body: createCourseSchema }), createCourse);
courseRoutes.put("/:id/trainers", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema, body: setCourseTrainersSchema }), setCourseTrainers);
courseRoutes.patch("/:id", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema, body: updateCourseSchema }), updateCourse);
courseRoutes.delete("/:id", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema }), deleteCourse);

export default courseRoutes;
