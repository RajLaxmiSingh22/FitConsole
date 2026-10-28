import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const PaymentDetails = sequelize.define("PaymentDetails", {
  paymentId: { type: DataTypes.UUID, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  reminderDate: DataTypes.DATEONLY,
  resolvedAt: DataTypes.DATE,
}, { tableName: "payment_details" });

export default PaymentDetails;
