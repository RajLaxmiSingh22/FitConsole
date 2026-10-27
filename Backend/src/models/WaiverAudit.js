import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const WaiverAudit = sequelize.define("WaiverAudit", {
  waiverAcceptanceId: { type: DataTypes.UUID, primaryKey: true },
  ipAddress: DataTypes.STRING,
}, { tableName: "waiver_audits" });

export default WaiverAudit;
