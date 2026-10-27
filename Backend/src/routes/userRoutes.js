import { Router } from "express";
import { createTrainer, listUsers, updateUserStatus } from "../controllers/userController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { trainerProvisionSchema, updateUserStatusSchema, userIdParamsSchema, userListQuerySchema } from "../validation/index.js";

const userRoutes = Router();
userRoutes.use(requireAuthentication, requireRole("owner"));
userRoutes.post("/trainers", validateRequest({ body: trainerProvisionSchema }), createTrainer);
userRoutes.get("/", validateRequest({ query: userListQuerySchema }), listUsers);
userRoutes.patch("/:id/status", validateRequest({ params: userIdParamsSchema, body: updateUserStatusSchema }), updateUserStatus);

export default userRoutes;
