import dotenv from "dotenv";

dotenv.config();
import { assertJwtSecret } from "./auth.js";
import { app } from "./app.js";
import { ensureOwnerAccount } from "./config/ownerAccount.js";
import { ensureTrainerAccounts } from "./config/trainerAccounts.js";
import { sequelize } from "./database.js";
import "./models/index.js";

const port = process.env.PORT ?? 9000;

try {
  assertJwtSecret();
  await sequelize.authenticate();
  await sequelize.sync();
  await sequelize.query('ALTER TABLE "payments" ALTER COLUMN "membership_id" DROP NOT NULL');
  await ensureOwnerAccount();
  await ensureTrainerAccounts();
  console.log("PostgreSQL connection established and models synchronized.");

  app.listen(port, () => {
    console.log(`FitConsole API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error("Failed to start FitConsole API:", error);
  process.exitCode = 1;
}
