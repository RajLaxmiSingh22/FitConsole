import { Router } from "express";
import { getOwnerDashboard, getTrainerDashboard } from "../controllers/dashboardController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";

const dashboardRoutes = Router();
dashboardRoutes.get("/owner", requireAuthentication, requireRole("owner"), getOwnerDashboard);
dashboardRoutes.get("/trainer", requireAuthentication, requireRole("trainer"), getTrainerDashboard);

export default dashboardRoutes;
