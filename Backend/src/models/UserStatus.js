import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const UserStatus = sequelize.define("UserStatus", {
  userId: { type: DataTypes.UUID, primaryKey: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "user_statuses" });

export default UserStatus;
