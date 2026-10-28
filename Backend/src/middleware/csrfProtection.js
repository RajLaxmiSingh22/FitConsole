import { ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER, tokensMatch } from "../auth.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Endpoints that either start a session or only consume the SameSite=Strict refresh cookie.
const EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

// Double-submit check: state-changing requests carrying a session cookie must echo the CSRF cookie in a header.
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path) || !req.cookies?.[ACCESS_COOKIE]) return next();
  if (!tokensMatch(req.get(CSRF_HEADER), req.cookies[CSRF_COOKIE])) {
    return res.status(403).json({ status: "error", message: "Invalid or missing CSRF token." });
  }
  return next();
}
