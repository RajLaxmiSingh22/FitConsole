import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const PaymentAudit = sequelize.define("PaymentAudit", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  paymentId: { type: DataTypes.UUID, allowNull: false, field: "payment_id" },
  userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
  action: { type: DataTypes.STRING(32), allowNull: false },
  oldValues: { type: DataTypes.JSONB, field: "old_values" },
  newValues: { type: DataTypes.JSONB, field: "new_values" },
}, {
  tableName: "payment_audit",
  createdAt: "created_at",
  updatedAt: false,
});

export default PaymentAudit;
