import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Client = sequelize.define("Client", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  trainerId: DataTypes.UUID,
  phone: DataTypes.STRING,
  emergencyContactPhone: DataTypes.STRING,
  dateOfBirth: DataTypes.DATEONLY,
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
  joinedAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "clients" });

export default Client;
