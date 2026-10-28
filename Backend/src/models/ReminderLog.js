import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

// Phone numbers and message text are deliberately not stored.
const ReminderLog = sequelize.define("ReminderLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  paymentId: { type: DataTypes.UUID, allowNull: false },
  clientId: { type: DataTypes.UUID, allowNull: false },
  sentById: DataTypes.UUID,
  channel: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "whatsapp" },
  amountDue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: "reminder_log" });

export default ReminderLog;
