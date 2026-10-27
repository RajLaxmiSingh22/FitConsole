import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const DietTracker = sequelize.define("DietTracker", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  recordedOn: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  weightKg: { type: DataTypes.DECIMAL(5, 2), validate: { min: 0.01 } },
  sleepDurationHours: { type: DataTypes.DECIMAL(4, 1), validate: { min: 0 } },
  hunger: DataTypes.STRING,
  mood: DataTypes.STRING,
  triggers: DataTypes.TEXT,
  calories: { type: DataTypes.INTEGER, validate: { min: 0 } },
  macronutrients: DataTypes.JSONB,
  fiberGrams: { type: DataTypes.DECIMAL(6, 2), validate: { min: 0 } },
  waterLiters: { type: DataTypes.DECIMAL(5, 2), validate: { min: 0 } },
}, {
  tableName: "diet_tracker",
  indexes: [{ fields: ["client_id", "recorded_on"] }],
});

export default DietTracker;
