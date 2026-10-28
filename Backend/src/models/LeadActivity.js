import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const LeadActivity = sequelize.define("LeadActivity", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  leadId: { type: DataTypes.UUID, allowNull: false },
  userId: DataTypes.UUID,
  type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [["note", "status_change", "trial_attendance", "enrollment"]] },
  },
  description: { type: DataTypes.TEXT, allowNull: false },
  previousStatus: DataTypes.STRING(32),
  newStatus: DataTypes.STRING(32),
}, {
  tableName: "lead_activities",
  indexes: [{ fields: ["lead_id", "created_at"] }],
});

export default LeadActivity;
