import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const CashfreeOrder = sequelize.define("CashfreeOrder", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  cashfreeOrderId: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  membershipId: DataTypes.UUID,
  createdById: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  reminderDate: DataTypes.DATEONLY,
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  status: {
    type: DataTypes.ENUM("pending", "success", "failed"),
    allowNull: false,
    defaultValue: "pending",
  },
  paymentId: DataTypes.UUID,
}, { tableName: "cashfree_orders" });

export default CashfreeOrder;
