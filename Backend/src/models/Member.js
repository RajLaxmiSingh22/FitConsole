import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Member = sequelize.define("Member", {
  userId: { type: DataTypes.UUID, primaryKey: true },
  phone: DataTypes.STRING,
  dateOfBirth: DataTypes.DATEONLY,
  joinedAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "members" });

export default Member;
