import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const DietPlan = sequelize.define("DietPlan", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: "member_id" },
  trainerId: { type: DataTypes.UUID, allowNull: false },
  courseId: DataTypes.UUID,
  plan: { type: DataTypes.JSONB, allowNull: false },
  status: {
    type: DataTypes.ENUM("draft", "approved", "rejected"),
    allowNull: false,
    defaultValue: "draft",
  },
  reviewedAt: DataTypes.DATE,
}, { tableName: "diet_plans" });

export default DietPlan;
