import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const Course = sequelize.define("Course", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  category: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: "monthly_price", validate: { min: 0 } },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  // Optional age eligibility (years) and level, shown on the website and enforced when enrolling.
  minAge: { type: DataTypes.SMALLINT, field: "min_age", validate: { min: 3, max: 100 } },
  maxAge: { type: DataTypes.SMALLINT, field: "max_age", validate: { min: 3, max: 100 } },
  level: { type: DataTypes.STRING(20), validate: { isIn: [["beginner", "intermediate", "advanced", "all_levels"]] } },
  // Uploaded cover (Cloudinary). Without one, the site shows `coverDefault` or the category's default cover.
  coverImageUrl: { type: DataTypes.TEXT, field: "cover_image_url" },
  coverImagePublicId: { type: DataTypes.STRING(255), field: "cover_image_public_id" },
  coverImageAlt: { type: DataTypes.STRING(200), field: "cover_image_alt" },
  coverDefault: { type: DataTypes.STRING(20), field: "cover_default", validate: { isIn: [["combat", "conditioning", "kids", "strength"]] } },
}, { tableName: "courses" });

export default Course;
