import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

// One weekly class slot. weekday is ISO 8601 (1 = Monday ... 7 = Sunday); times are gym-local.
const ClassSession = sequelize.define("ClassSession", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseId: { type: DataTypes.UUID, allowNull: false },
  trainerId: DataTypes.UUID,
  weekday: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 7 } },
  startTime: { type: DataTypes.TIME, allowNull: false },
  endTime: { type: DataTypes.TIME, allowNull: false },
  level: DataTypes.STRING(40),
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: "class_sessions",
  indexes: [{ fields: ["weekday", "start_time"] }, { fields: ["trainer_id"] }],
});

export default ClassSession;
