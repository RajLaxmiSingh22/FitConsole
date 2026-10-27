import JWT from "jsonwebtoken";
import { User, UserStatus } from "../models/index.js";

export async function requireAuthentication(req, res, next) {
  try {
    const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const payload = JWT.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const id = typeof payload === "object" ? payload.sub : undefined;
    if (!id) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const [user, status] = await Promise.all([
      User.findByPk(id, { attributes: ["id", "fullName", "email", "role"] }),
      UserStatus.findByPk(id),
    ]);
    if (!user || status?.active === false) {
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }
    if (user.role === "owner" && user.email !== process.env.OWNER_EMAIL?.trim().toLowerCase()) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof JWT.JsonWebTokenError) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    console.error("Authentication middleware failed:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
}
