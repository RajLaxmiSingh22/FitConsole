import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const ProgressEntry = sequelize.define("ProgressEntry", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  weightKg: { type: DataTypes.DECIMAL(5, 2), validate: { min: 0.01 } },
  stamina: { type: DataTypes.SMALLINT, validate: { min: 1, max: 10 } },
  staminaNotes: DataTypes.TEXT,
  recordedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "progress_entries" });

export default ProgressEntry;
