import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const EmailLog = sequelize.define("EmailLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  kind: { type: DataTypes.STRING(40), allowNull: false },
  referenceId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: "email_log",
  indexes: [
    { unique: true, fields: ["kind", "reference_id"] },
    { fields: ["user_id", "created_at"] },
  ],
});

export default EmailLog;
