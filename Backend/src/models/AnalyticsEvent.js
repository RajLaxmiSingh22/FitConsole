import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const AnalyticsEvent = sequelize.define("AnalyticsEvent", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  eventId: { type: DataTypes.UUID, allowNull: false, unique: true },
  visitorId: DataTypes.UUID,
  sessionId: DataTypes.UUID,
  type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [["page_view", "form_start", "form_submit", "trial_booking", "trial_attendance", "enrollment"]] },
  },
  page: { type: DataTypes.STRING(512), allowNull: false },
  source: DataTypes.STRING(80),
  utmSource: DataTypes.STRING(120),
  utmMedium: DataTypes.STRING(120),
  utmCampaign: DataTypes.STRING(160),
  leadId: DataTypes.UUID,
}, {
  tableName: "analytics_events",
  indexes: [
    { fields: ["type", "created_at"] },
    { fields: ["visitor_id", "created_at"] },
    { fields: ["session_id", "created_at"] },
  ],
});

export default AnalyticsEvent;
