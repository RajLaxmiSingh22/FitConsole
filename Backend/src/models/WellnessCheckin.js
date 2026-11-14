import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

// Client's self-reported daily wellness check-in (not a medical record).
const WellnessCheckin = sequelize.define("WellnessCheckin", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  recordedOn: { type: DataTypes.DATEONLY, allowNull: false },
  mood: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [["happy", "neutral", "low"]] } },
  energy: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 5 } },
  stress: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 5 } },
  motivation: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 5 } },
  soreness: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 5 } },
  digestion: { type: DataTypes.SMALLINT, validate: { min: 1, max: 5 } },
  sleepHours: { type: DataTypes.DECIMAL(4, 1), validate: { min: 0, max: 24 } },
  pain: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  problem: DataTypes.TEXT,
  notes: DataTypes.TEXT,
}, {
  tableName: "wellness_checkins",
  indexes: [{ unique: true, fields: ["client_id", "recorded_on"] }],
});

export default WellnessCheckin;
