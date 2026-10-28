import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  login,
  logout,
  refreshSession,
  register,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { loginAccountKey } from "../middleware/loginFailureLimit.js";
import { publicRateLimit } from "../middleware/publicRateLimit.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  forgotPasswordSchema,
  loginValidation,
  passwordChangeSchema,
  registerValidation,
  resetPasswordSchema,
} from "../validation/index.js";

const authRoutes = Router();

authRoutes.post("/register", publicRateLimit({ limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: "register" }), validateRequest({ body: registerValidation }), register);
authRoutes.post(
  "/login",
  publicRateLimit({ limit: 30, windowMs: 15 * 60 * 1000, keyPrefix: "login-ip" }),
  publicRateLimit({
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: "login-email",
    keyGenerator: (req) => `${req.ip || "unknown"}:${loginAccountKey(req.body?.email)}`,
  }),
  validateRequest({ body: loginValidation }),
  login,
);
authRoutes.post("/forgot-password", publicRateLimit({ limit: 3, windowMs: 60 * 60 * 1000, keyPrefix: "password-reset" }), validateRequest({ body: forgotPasswordSchema }), requestPasswordReset);
authRoutes.post("/reset-password", publicRateLimit({ limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: "password-reset-complete" }), validateRequest({ body: resetPasswordSchema }), resetPassword);
authRoutes.post("/refresh", publicRateLimit({ limit: 60, windowMs: 15 * 60 * 1000, keyPrefix: "auth-refresh" }), refreshSession);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuthentication, getCurrentUser);
authRoutes.patch("/password", requireAuthentication, validateRequest({ body: passwordChangeSchema }), changePassword);

export default authRoutes;
