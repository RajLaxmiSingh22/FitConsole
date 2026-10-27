import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const DietPlanReview = sequelize.define("DietPlanReview", {
  dietPlanId: { type: DataTypes.UUID, primaryKey: true },
  reviewedBy: { type: DataTypes.UUID, allowNull: false },
}, { tableName: "diet_plan_reviews" });

export default DietPlanReview;
