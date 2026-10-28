import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("owner", "trainer", "client"), allowNull: false },
  tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "users" });

export default User;
