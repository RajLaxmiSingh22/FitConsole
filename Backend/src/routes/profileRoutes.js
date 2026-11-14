import express, { Router } from "express";
import { deleteAvatar, getAvatar, getProfile, setCoaching, updateProfile, uploadAvatar } from "../controllers/profileController.js";
import { optionalAuthentication } from "../middleware/optionalAuthentication.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { coachingToggleSchema, idParamsSchema, profileUpdateSchema } from "../validation/index.js";

const imageBody = express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "256kb" });

const profileRoutes = Router();
profileRoutes.get("/", requireAuthentication, getProfile);
profileRoutes.patch("/", requireAuthentication, validateRequest({ body: profileUpdateSchema }), updateProfile);
profileRoutes.put("/avatar", requireAuthentication, imageBody, uploadAvatar);
profileRoutes.delete("/avatar", requireAuthentication, deleteAvatar);
profileRoutes.get("/avatar/:id", optionalAuthentication, validateRequest({ params: idParamsSchema }), getAvatar);
profileRoutes.put("/coaching", requireAuthentication, requireRole("owner"), validateRequest({ body: coachingToggleSchema }), setCoaching);

export default profileRoutes;
