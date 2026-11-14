import { Router } from "express";
import {
  createSession,
  deleteSession,
  listAllSessions,
  listPublicSchedule,
  updateSession,
} from "../controllers/scheduleController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { classSessionIdParamsSchema, createClassSessionSchema, updateClassSessionSchema } from "../validation/index.js";

const scheduleRoutes = Router();
scheduleRoutes.get("/", listPublicSchedule);
scheduleRoutes.get("/manage", requireAuthentication, requireRole("owner"), listAllSessions);
scheduleRoutes.post("/", requireAuthentication, requireRole("owner"), validateRequest({ body: createClassSessionSchema }), createSession);
scheduleRoutes.patch("/:id", requireAuthentication, requireRole("owner"), validateRequest({ params: classSessionIdParamsSchema, body: updateClassSessionSchema }), updateSession);
scheduleRoutes.delete("/:id", requireAuthentication, requireRole("owner"), validateRequest({ params: classSessionIdParamsSchema }), deleteSession);

export default scheduleRoutes;
