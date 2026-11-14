import { Router } from "express";
import { getOwnerGymContact, saveGymContact } from "../controllers/gymSettingsController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { gymContactSchema } from "../validation/index.js";

const gymSettingsRoutes = Router();
gymSettingsRoutes.use(requireAuthentication, requireRole("owner"));
gymSettingsRoutes.get("/contact", getOwnerGymContact);
gymSettingsRoutes.put("/contact", validateRequest({ body: gymContactSchema }), saveGymContact);

export default gymSettingsRoutes;
