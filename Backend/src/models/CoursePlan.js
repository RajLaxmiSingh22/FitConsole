import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const CoursePlan = sequelize.define("CoursePlan", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseId: { type: DataTypes.UUID, allowNull: false },
  durationMonths: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { isIn: [[1, 3, 6, 12]] },
  },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
}, {
  tableName: "course_plans",
  indexes: [{ unique: true, fields: ["course_id", "duration_months"] }],
});

export default CoursePlan;
