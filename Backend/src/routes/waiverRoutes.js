import { Router } from "express";
import { acceptWaiver, getCurrentWaiver } from "../controllers/waiverController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { acceptWaiverSchema } from "../validation/index.js";

const waiverRoutes = Router();
waiverRoutes.get("/current", getCurrentWaiver);
waiverRoutes.post("/accept", requireAuthentication, requireRole("client"), validateRequest({ body: acceptWaiverSchema }), acceptWaiver);

export default waiverRoutes;
