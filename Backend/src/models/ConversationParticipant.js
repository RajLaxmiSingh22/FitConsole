import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const ConversationParticipant = sequelize.define("ConversationParticipant", {
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
}, { tableName: "conversation_participants", timestamps: false });

export default ConversationParticipant;
