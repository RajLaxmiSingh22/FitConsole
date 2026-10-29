import dotenv from "dotenv";

dotenv.config();
import { sequelize } from "./database.js";
import { runMigrations } from "./runMigrations.js";

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
