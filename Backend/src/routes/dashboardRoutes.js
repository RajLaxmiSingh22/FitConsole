import { Router } from "express";
import { getOwnerDashboard, getTrainerDashboard } from "../controllers/dashboardController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { getOwnerAnalytics } from "../controllers/ownerAnalyticsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { reportRangeQuerySchema } from "../validation/index.js";

const dashboardRoutes = Router();
dashboardRoutes.get("/owner", requireAuthentication, requireRole("owner"), getOwnerDashboard);
dashboardRoutes.get(
  "/owner/analytics",
  requireAuthentication,
  requireRole("owner"),
  validateRequest({ query: reportRangeQuerySchema }),
  getOwnerAnalytics,
);
dashboardRoutes.get("/trainer", requireAuthentication, requireRole("trainer"), getTrainerDashboard);

export default dashboardRoutes;
