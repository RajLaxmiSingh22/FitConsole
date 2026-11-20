import dotenv from "dotenv";

dotenv.config();
import { createMigrationSequelize } from "./database.js";
import { runMigrations } from "./runMigrations.js";

const sequelize = createMigrationSequelize();

try {
  await sequelize.authenticate();
  await runMigrations(sequelize);
  console.log("Database migrations are up to date.");
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
