import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { csrfProtection } from "./middleware/csrfProtection.js";
import authRoutes from "./routes/authRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import dietEntryRoutes from "./routes/dietEntryRoutes.js";
import dietPlanRoutes from "./routes/dietPlanRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import paymentRoutes, { cashfreeWebhookRoutes } from "./routes/paymentRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import trainerRoutes from "./routes/trainerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import waiverRoutes from "./routes/waiverRoutes.js";

export const app = express();

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 5.");
}
app.set("trust proxy", trustProxyHops);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
if (allowedOrigins.has("http://localhost:5173")) {
  allowedOrigins.add("http://127.0.0.1:5173");
}

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  exposedHeaders: ["Content-Disposition"],
}));
app.use("/api/payments", cashfreeWebhookRoutes);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(csrfProtection);
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/waivers", waiverRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/diet-entries", dietEntryRoutes);
app.use("/api/diet-plans", dietPlanRoutes);
app.use("/api", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "Route not found." });
});

// Express identifies error handlers by their four-argument signature.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ status: "error", message: "Request body must be valid JSON." });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ status: "error", message: "Request body is too large." });
  }
  console.error("Unhandled request error:", error);
  return res.status(500).json({ status: "error", message: "Internal server error." });
});
