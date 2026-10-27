import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const TrainerDetails = sequelize.define("TrainerDetails", {
  userId: { type: DataTypes.UUID, primaryKey: true },
  experienceYears: { type: DataTypes.DECIMAL(4, 1), validate: { min: 0 } },
  details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { tableName: "trainer_details" });

export default TrainerDetails;
