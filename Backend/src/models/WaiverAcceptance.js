import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const WaiverAcceptance = sequelize.define("WaiverAcceptance", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  agreementVersion: { type: DataTypes.STRING, allowNull: false },
  acceptedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  documentReference: DataTypes.TEXT,
}, {
  tableName: "waiver_acceptances",
  indexes: [{ unique: true, fields: ["client_id", "agreement_version"] }],
});

export default WaiverAcceptance;
