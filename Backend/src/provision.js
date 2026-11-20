import { ensureOwnerAccount } from "./config/ownerAccount.js";
import { ensureTrainerAccounts } from "./config/trainerAccounts.js";
import { sequelize } from "./database.js";

try {
  await sequelize.authenticate();
  await ensureOwnerAccount();
  await ensureTrainerAccounts();
  console.log("Owner and trainer bootstrap accounts are ready.");
} catch (error) {
  console.error("Account provisioning failed:", error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
