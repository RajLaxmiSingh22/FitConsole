import { resolveAuthenticatedUser } from "./requireAuthentication.js";

// Invalid or expired tokens fall back to the anonymous view instead of failing the request.
export async function optionalAuthentication(req, res, next) {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (user) req.user = user;
    return next();
  } catch (error) {
    console.error("Optional authentication failed:", error);
    return res.status(500).json({ status: "error", message: "Internal server error." });
  }
}
