import { Router } from "express";
import { changePassword, getCurrentUser, login, register } from "../controllers/authController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { loginValidation, passwordChangeSchema, registerValidation } from "../validation/index.js";

const authRoutes = Router();

authRoutes.post("/register", validateRequest({ body: registerValidation }), register);
authRoutes.post("/login", validateRequest({ body: loginValidation }), login);
authRoutes.get("/me", requireAuthentication, getCurrentUser);
authRoutes.patch("/password", requireAuthentication, validateRequest({ body: passwordChangeSchema }), changePassword);

export default authRoutes;
