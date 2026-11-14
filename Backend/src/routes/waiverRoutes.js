import { Router } from "express";
import { acceptWaiver, getCurrentWaiver, listWaiverVersions, publishWaiver } from "../controllers/waiverController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { acceptWaiverSchema, publishWaiverSchema } from "../validation/index.js";

const waiverRoutes = Router();
waiverRoutes.get("/current", getCurrentWaiver);
waiverRoutes.get("/versions", requireAuthentication, requireRole("owner"), listWaiverVersions);
waiverRoutes.post("/", requireAuthentication, requireRole("owner"), validateRequest({ body: publishWaiverSchema }), publishWaiver);
waiverRoutes.post("/accept", requireAuthentication, requireRole("client"), validateRequest({ body: acceptWaiverSchema }), acceptWaiver);

export default waiverRoutes;
