import { Router } from "express";
import { getAnalyticsSummary } from "../controllers/analyticsController.js";
import { getGymOverview, listMemberAnalytics } from "../controllers/memberAnalyticsController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { analyticsSummaryQuerySchema, gymOverviewQuerySchema } from "../validation/index.js";

const analyticsRoutes = Router();
analyticsRoutes.get(
  "/summary",
  requireAuthentication,
  requireRole("owner"),
  validateRequest({ query: analyticsSummaryQuerySchema }),
  getAnalyticsSummary,
);

analyticsRoutes.get("/members", requireAuthentication, requireRole("owner", "trainer"), listMemberAnalytics);
analyticsRoutes.get("/gym", requireAuthentication, requireRole("owner"), validateRequest({ query: gymOverviewQuerySchema }), getGymOverview);

export default analyticsRoutes;
