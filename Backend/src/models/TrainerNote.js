import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

// "note" is visible to staff only; "recommendation" is also shown to the client.
const TrainerNote = sequelize.define("TrainerNote", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  authorId: DataTypes.UUID,
  kind: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [["note", "recommendation"]] } },
  body: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: "trainer_notes",
  indexes: [{ fields: ["client_id", "created_at"] }],
});

export default TrainerNote;
