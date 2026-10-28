import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const PasswordResetToken = sequelize.define("PasswordResetToken", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: DataTypes.DATE,
}, {
  tableName: "password_reset_tokens",
  indexes: [{ fields: ["user_id", "expires_at"] }],
});

export default PasswordResetToken;
