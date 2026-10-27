import { Router } from "express";
import {
  getTrainer,
  listMyClients,
  listTrainers,
  updateMyTrainer,
  updateTrainer,
} from "../controllers/trainerController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { trainerIdParamsSchema, trainerProfileSchema } from "../validation/index.js";

const trainerRoutes = Router();
trainerRoutes.get("/", listTrainers);
trainerRoutes.get("/me/clients", requireAuthentication, requireRole("trainer"), listMyClients);
trainerRoutes.patch("/me", requireAuthentication, requireRole("trainer"), validateRequest({ body: trainerProfileSchema }), updateMyTrainer);
trainerRoutes.get("/:id", validateRequest({ params: trainerIdParamsSchema }), getTrainer);
trainerRoutes.patch("/:id", requireAuthentication, requireRole("owner"), validateRequest({ params: trainerIdParamsSchema, body: trainerProfileSchema }), updateTrainer);

export default trainerRoutes;
