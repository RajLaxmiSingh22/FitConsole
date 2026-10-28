import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Attendance = sequelize.define("Attendance", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: "member_id" },
  courseId: { type: DataTypes.UUID, allowNull: false },
  trainerId: DataTypes.UUID,
  attendedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  attendedOn: { type: DataTypes.DATEONLY, allowNull: false, field: "attended_on" },
  override: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  overrideReason: DataTypes.TEXT,
}, { tableName: "attendance" });

export default Attendance;
