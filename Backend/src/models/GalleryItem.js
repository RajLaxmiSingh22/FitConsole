import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const GalleryItem = sequelize.define("GalleryItem", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mediaType: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [["image", "video"]] } },
  title: { type: DataTypes.STRING(80), allowNull: false },
  caption: { type: DataTypes.STRING(160), allowNull: true },
  publicId: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  url: { type: DataTypes.TEXT, allowNull: false },
  posterUrl: { type: DataTypes.TEXT, allowNull: true },
  width: { type: DataTypes.INTEGER, allowNull: true },
  height: { type: DataTypes.INTEGER, allowNull: true },
  bytes: { type: DataTypes.INTEGER, allowNull: true },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  uploadedBy: { type: DataTypes.UUID, allowNull: true },
}, { tableName: "gallery_items" });

export default GalleryItem;
