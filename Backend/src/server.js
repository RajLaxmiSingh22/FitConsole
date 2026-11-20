import dotenv from "dotenv";

dotenv.config();
import { assertJwtSecret } from "./auth.js";
import { app } from "./app.js";
import { ensureOwnerAccount } from "./config/ownerAccount.js";
import { ensureTrainerAccounts } from "./config/trainerAccounts.js";
import { createMigrationSequelize, sequelize } from "./database.js";
import { startDailyJob } from "./jobs/daily.js";
import { runMigrations } from "./runMigrations.js";
import { getGstRate } from "./utils/gst.js";
import { getCurrentWaiver, warnIfWaiverMissing } from "./utils/waiver.js";
import "./models/index.js";

const port = process.env.PORT ?? 9000;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

try {
  assertJwtSecret();
  getGstRate();
  const migrationSequelize = createMigrationSequelize();
  try {
    await migrationSequelize.authenticate();
    await runMigrations(migrationSequelize);
  } finally {
    if (migrationSequelize !== sequelize) await migrationSequelize.close();
  }
  await sequelize.authenticate();
  warnIfWaiverMissing(await getCurrentWaiver());
  await ensureOwnerAccount();
  await ensureTrainerAccounts();
  console.log("PostgreSQL connection established and migrations are up to date.");

  const dailyJob = process.env.RUN_JOBS === "true" ? startDailyJob() : null;
  if (dailyJob) console.log("Daily maintenance job scheduled for 00:05 gym time.");

  const server = app.listen(port, () => {
    console.log(`FitConsole API listening on http://localhost:${port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down.`);
    dailyJob?.stop();
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
} catch (error) {
  console.error("Failed to start FitConsole API:", error);
  process.exitCode = 1;
}
