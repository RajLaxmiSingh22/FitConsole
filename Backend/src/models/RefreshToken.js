import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const RefreshToken = sequelize.define("RefreshToken", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: DataTypes.DATE,
  replacedById: DataTypes.UUID,
}, { tableName: "refresh_tokens" });

export default RefreshToken;
