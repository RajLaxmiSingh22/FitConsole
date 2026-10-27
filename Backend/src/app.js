import cors from "cors";
import express from "express";
import helmet from "helmet";
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
import paymentRoutes from "./routes/paymentRoutes.js";
import trainerRoutes from "./routes/trainerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import waiverRoutes from "./routes/waiverRoutes.js";

export const app = express();

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
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json());
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
