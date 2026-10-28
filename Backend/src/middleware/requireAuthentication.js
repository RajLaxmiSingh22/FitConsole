import JWT from "jsonwebtoken";
import { ACCESS_COOKIE } from "../auth.js";
import { User, UserStatus } from "../models/index.js";

// Loads an active user whose token version still matches, or null.
export async function loadActiveUser(id, { tokenVersion, transaction } = {}) {
  const [user, status] = await Promise.all([
    User.findByPk(id, { attributes: ["id", "fullName", "email", "role", "tokenVersion"], transaction }),
    UserStatus.findByPk(id, { transaction }),
  ]);
  if (!user || status?.active === false) return null;
  if (tokenVersion !== undefined && tokenVersion !== user.tokenVersion) return null;
  if (user.role === "owner" && user.email !== process.env.OWNER_EMAIL?.trim().toLowerCase()) return null;
  return user;
}

// Resolves the access-token cookie to an active user, or null when it is missing, invalid, or revoked.
export async function resolveAuthenticatedUser(req) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return null;

  let payload;
  try {
    payload = JWT.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (error) {
    if (error instanceof JWT.JsonWebTokenError) return null;
    throw error;
  }
  const id = typeof payload === "object" ? payload.sub : undefined;
  if (!id) return null;

  return loadActiveUser(id, { tokenVersion: payload.ver ?? 0 });
}

export async function requireAuthentication(req, res, next) {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication middleware failed:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
}
