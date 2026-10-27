import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Message = sequelize.define("Message", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  senderId: { type: DataTypes.UUID, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  readAt: DataTypes.DATE,
}, {
  tableName: "messages",
  indexes: [{ fields: ["conversation_id", "created_at"] }],
});

export default Message;
