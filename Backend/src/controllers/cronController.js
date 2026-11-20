import { timingSafeEqual } from "node:crypto";
import { runDailyJobWithLock } from "../jobs/daily.js";

export async function dailyMaintenance(req, res) {
  const secret = process.env.CRON_SECRET;
  const expected = secret ? Buffer.from(`Bearer ${secret}`) : Buffer.alloc(0);
  const authorization = Buffer.from(req.headers.authorization ?? "");
  const authorized = expected.length > 0
    && authorization.length === expected.length
    && timingSafeEqual(authorization, expected);

  if (!authorized) {
    return res.status(secret ? 401 : 503).json({
      status: "error",
      message: secret ? "Unauthorized." : "Scheduled maintenance is not configured.",
    });
  }

  try {
    const summary = await runDailyJobWithLock();
    return res.status(200).json({ status: "success", data: summary ?? { skipped: true } });
  } catch (error) {
    console.error("Scheduled daily maintenance failed:", error);
    return res.status(500).json({ status: "error", message: "Scheduled maintenance failed." });
  }
}
