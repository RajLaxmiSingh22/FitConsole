import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Trainer = sequelize.define("Trainer", {
  userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  id: { type: DataTypes.UUID, allowNull: false, defaultValue: DataTypes.UUIDV4, unique: true },
  phone: DataTypes.STRING,
  certification: DataTypes.STRING,
}, { tableName: "trainers" });

export default Trainer;
