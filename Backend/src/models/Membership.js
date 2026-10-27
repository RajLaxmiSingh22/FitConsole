import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Membership = sequelize.define("Membership", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: "member_id" },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isAfterStartDate(value) {
        if (value < this.startDate) {
          throw new Error("Membership end date must be on or after its start date.");
        }
      },
    },
  },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
  status: {
    type: DataTypes.ENUM("active", "expired", "cancelled"),
    allowNull: false,
    defaultValue: "active",
  },
}, { tableName: "memberships" });

export default Membership;
