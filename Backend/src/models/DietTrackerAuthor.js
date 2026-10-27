import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

const DietTrackerAuthor = sequelize.define("DietTrackerAuthor", {
  dietTrackerId: { type: DataTypes.UUID, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
}, { tableName: "diet_tracker_authors" });

export default DietTrackerAuthor;
