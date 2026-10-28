import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const WebsiteLead = sequelize.define("WebsiteLead", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(24), allowNull: false },
  normalizedPhone: { type: DataTypes.STRING(10), allowNull: false },
  email: { type: DataTypes.STRING(320), validate: { isEmail: true } },
  courseId: DataTypes.UUID,
  preferredDate: DataTypes.DATEONLY,
  preferredSlot: DataTypes.STRING(120),
  message: DataTypes.TEXT,
  consent: { type: DataTypes.BOOLEAN, allowNull: false },
  source: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "website" },
  landingPage: DataTypes.STRING(512),
  utmSource: DataTypes.STRING(120),
  utmMedium: DataTypes.STRING(120),
  utmCampaign: DataTypes.STRING(160),
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: "new",
    validate: {
      isIn: [["new", "contacted", "trial_scheduled", "trial_confirmed", "trial_attended", "no_show", "enrolled", "lost"]],
    },
  },
  trialAttendedAt: DataTypes.DATE,
  clientId: DataTypes.UUID,
}, {
  tableName: "website_leads",
  indexes: [
    { fields: ["normalized_phone", "created_at"] },
    { fields: ["status", "created_at"] },
    { fields: ["course_id", "created_at"] },
  ],
});

export default WebsiteLead;
