import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const ProgressEntry = sequelize.define("ProgressEntry", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  weightKg: { type: DataTypes.DECIMAL(5, 2), validate: { min: 0.01 } },
  stamina: { type: DataTypes.SMALLINT, validate: { min: 1, max: 10 } },
  staminaNotes: DataTypes.TEXT,
  waistCm: { type: DataTypes.DECIMAL(5, 1), validate: { min: 0.1 } },
  chestCm: { type: DataTypes.DECIMAL(5, 1), validate: { min: 0.1 } },
  armCm: { type: DataTypes.DECIMAL(5, 1), validate: { min: 0.1 } },
  hipsCm: { type: DataTypes.DECIMAL(5, 1), validate: { min: 0.1 } },
  // True when only the period is known (e.g. "end of August"); context explains the record.
  approximateDate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "approximate_date" },
  context: DataTypes.TEXT,
  recordedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "progress_entries" });

export default ProgressEntry;
