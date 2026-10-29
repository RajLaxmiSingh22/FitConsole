import { Router } from "express";
import { getAnalyticsSummary } from "../controllers/analyticsController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { analyticsSummaryQuerySchema } from "../validation/index.js";

const analyticsRoutes = Router();
analyticsRoutes.get(
  "/summary",
  requireAuthentication,
  requireRole("owner"),
  validateRequest({ query: analyticsSummaryQuerySchema }),
  getAnalyticsSummary,
);

export default analyticsRoutes;
