import { sequelize } from "../database.js";

export async function getHealth(_req, res) {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", service: "fitconsole-api", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "error",
      message: "Database is unavailable.",
    });
  }
}
