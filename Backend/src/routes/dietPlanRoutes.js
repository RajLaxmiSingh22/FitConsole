import { Router } from "express";
import {
  approveDietPlan,
  updateDietPlan,
} from "../controllers/dietPlanController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { dietPlanIdParamsSchema, updateDietPlanSchema } from "../validation/index.js";

const dietPlanRoutes = Router();
dietPlanRoutes.use(requireAuthentication, requireRole("trainer"));
dietPlanRoutes.patch("/:planId", validateRequest({ params: dietPlanIdParamsSchema, body: updateDietPlanSchema }), updateDietPlan);
dietPlanRoutes.post("/:planId/approve", validateRequest({ params: dietPlanIdParamsSchema }), approveDietPlan);

export default dietPlanRoutes;
