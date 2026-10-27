import { Router } from "express";
import { exportClients, exportPayments } from "../controllers/exportController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";

const exportRoutes = Router();
exportRoutes.use(requireAuthentication, requireRole("owner"));
exportRoutes.get("/payments.xlsx", exportPayments);
exportRoutes.get("/clients.xlsx", exportClients);

export default exportRoutes;
