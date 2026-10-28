import { Router } from "express";
import {
  assignLeadCourse,
  addLeadNote,
  enrollLead,
  getLead,
  listLeads,
  updateLeadStatus,
} from "../controllers/leadController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  leadIdParamsSchema,
  leadCourseSchema,
  leadListQuerySchema,
  leadNoteSchema,
  leadStatusSchema,
} from "../validation/index.js";
import Joi from "joi";

const leadRoutes = Router();
const enrollmentSchema = Joi.object({
  durationMonths: Joi.number().valid(1, 3, 6, 12).required(),
});

leadRoutes.use(requireAuthentication, requireRole("owner"));
leadRoutes.get("/", validateRequest({ query: leadListQuerySchema }), listLeads);
leadRoutes.get("/:id", validateRequest({ params: leadIdParamsSchema }), getLead);
leadRoutes.patch("/:id/status", validateRequest({ params: leadIdParamsSchema, body: leadStatusSchema }), updateLeadStatus);
leadRoutes.post("/:id/notes", validateRequest({ params: leadIdParamsSchema, body: leadNoteSchema }), addLeadNote);
leadRoutes.patch("/:id/course", validateRequest({ params: leadIdParamsSchema, body: leadCourseSchema }), assignLeadCourse);
leadRoutes.post("/:id/enroll", validateRequest({ params: leadIdParamsSchema, body: enrollmentSchema }), enrollLead);

export default leadRoutes;
