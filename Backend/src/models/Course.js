import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Course = sequelize.define("Course", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  category: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: "monthly_price", validate: { min: 0 } },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "courses" });

export default Course;
