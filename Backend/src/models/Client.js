import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Client = sequelize.define("Client", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  trainerId: DataTypes.UUID,
  phone: DataTypes.STRING,
  emergencyContactPhone: DataTypes.STRING,
  // Parent or guardian for members under 18; their phone is emergencyContactPhone.
  guardianName: { type: DataTypes.STRING(255), field: "guardian_name" },
  dateOfBirth: DataTypes.DATEONLY,
  // Planned training weekdays (ISO 1–7); null = default Mon / Wed / Fri.
  trainingDays: { type: DataTypes.ARRAY(DataTypes.SMALLINT), field: "training_days" },
  targetWeightKg: { type: DataTypes.DECIMAL(5, 2), field: "target_weight_kg", validate: { min: 0.01 } },
  // Temporary restrictions: { avoid[], suitable[], source, since, expectedDuration, reviewOn, active, notes }.
  dietRestrictions: { type: DataTypes.JSONB, field: "diet_restrictions" },
  // { types[], minutesMin, minutesMax, notes }
  workoutProfile: { type: DataTypes.JSONB, field: "workout_profile" },
  heightCm: { type: DataTypes.DECIMAL(5, 2), validate: { min: 0.01 } },
  weightKg: { type: DataTypes.DECIMAL(5, 2), validate: { min: 0.01 } },
  goal: DataTypes.TEXT,
  healthIssues: DataTypes.TEXT,
  injuries: DataTypes.TEXT,
  bloodGroup: {
  type: DataTypes.ENUM(
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
  ),
  allowNull: true,
},
  address: DataTypes.TEXT,
  idProofReference: DataTypes.TEXT,
  gender: DataTypes.STRING,
  goalCategory: DataTypes.STRING(16),
  dietPreference: DataTypes.STRING(16),
  allergies: { type: DataTypes.ARRAY(DataTypes.STRING(32)), allowNull: false, defaultValue: [] },
  joinedAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "clients" });

export default Client;
