import express, { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourse,
  COURSE_COVER_TYPES,
  removeCourseCoverImage,
  uploadCourseCoverImage,
  listCourses,
  setCourseTrainers,
  updateCourse,
} from "../controllers/courseController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { courseCoverQuerySchema, courseIdParamsSchema, createCourseSchema, setCourseTrainersSchema, updateCourseSchema } from "../validation/index.js";

const courseRoutes = Router();
courseRoutes.get("/", listCourses);
courseRoutes.get("/:id", validateRequest({ params: courseIdParamsSchema }), getCourse);
courseRoutes.post("/", requireAuthentication, requireRole("owner"), validateRequest({ body: createCourseSchema }), createCourse);
courseRoutes.put("/:id/trainers", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema, body: setCourseTrainersSchema }), setCourseTrainers);
courseRoutes.patch("/:id", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema, body: updateCourseSchema }), updateCourse);
courseRoutes.delete("/:id", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema }), deleteCourse);
// Raw image body; the limit sits just above 5 MB so the controller can answer 413 with a clear message.
const coverBody = express.raw({ type: COURSE_COVER_TYPES, limit: "6mb" });
courseRoutes.post("/:id/cover", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema, query: courseCoverQuerySchema }), coverBody, uploadCourseCoverImage);
courseRoutes.delete("/:id/cover", requireAuthentication, requireRole("owner"), validateRequest({ params: courseIdParamsSchema }), removeCourseCoverImage);

export default courseRoutes;
