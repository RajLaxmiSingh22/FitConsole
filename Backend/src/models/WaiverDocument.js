import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const WaiverDocument = sequelize.define("WaiverDocument", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  version: { type: DataTypes.STRING(32), allowNull: false, unique: true },
  text: { type: DataTypes.TEXT, allowNull: false },
  publishedBy: DataTypes.UUID,
}, {
  tableName: "waiver_documents",
  indexes: [{ fields: ["created_at"] }],
});

export default WaiverDocument;
