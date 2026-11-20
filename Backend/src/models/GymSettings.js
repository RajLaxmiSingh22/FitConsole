import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

// Single-row table of the gym's public contact details (see migration 202611150001).
const GymSettings = sequelize.define("GymSettings", {
  id: { type: DataTypes.SMALLINT, primaryKey: true, defaultValue: 1 },
  phone: { type: DataTypes.STRING(40), allowNull: true },
  email: { type: DataTypes.STRING(254), allowNull: true },
  address: { type: DataTypes.STRING(300), allowNull: true },
  mapUrl: { type: DataTypes.STRING(500), allowNull: true, field: "map_url" },
  whatsappEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "whatsapp_enabled" },
  updatedBy: { type: DataTypes.UUID, allowNull: true, field: "updated_by" },
}, { tableName: "gym_settings" });

export default GymSettings;
