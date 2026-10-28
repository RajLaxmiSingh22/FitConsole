import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Payment = sequelize.define("Payment", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  membershipId: { type: DataTypes.UUID, allowNull: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  paymentMethod: { type: DataTypes.ENUM("cash", "upi", "card"), allowNull: false },
  reference: DataTypes.STRING,
  needsReview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  voidedAt: DataTypes.DATE,
  voidReason: DataTypes.TEXT,
  // Assigned by the database sequence; never set by application code.
  invoiceNumber: { type: DataTypes.BIGINT },
  dateTime: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "paid_at" },
}, { tableName: "payments" });

export default Payment;
