import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";
import { PLAN_DURATIONS } from "../utils/plans.js";

const CoursePlan = sequelize.define("CoursePlan", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseId: { type: DataTypes.UUID, allowNull: false },
  durationMonths: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { isIn: [PLAN_DURATIONS] },
  },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
}, {
  tableName: "course_plans",
  indexes: [{ unique: true, fields: ["course_id", "duration_months"] }],
});

export default CoursePlan;
