import { Router } from "express";
import {
  deleteDietEntry,
  updateDietEntry,
} from "../controllers/dietTrackerController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { dietEntryParamsSchema, dietEntrySchema } from "../validation/index.js";

const dietEntryRoutes = Router();
dietEntryRoutes.use(requireAuthentication, requireRole("client", "trainer"));
dietEntryRoutes.patch("/:entryId", validateRequest({ params: dietEntryParamsSchema, body: dietEntrySchema }), updateDietEntry);
dietEntryRoutes.delete("/:entryId", validateRequest({ params: dietEntryParamsSchema }), deleteDietEntry);

export default dietEntryRoutes;
