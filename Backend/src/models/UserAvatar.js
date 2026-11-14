import { DataTypes } from "sequelize";
import { sequelize } from "../database.js";

// Either `data` (stored in Postgres) or `url` + `publicId` (stored in Cloudinary) is set.
const UserAvatar = sequelize.define("UserAvatar", {
  userId: { type: DataTypes.UUID, primaryKey: true },
  mimeType: { type: DataTypes.STRING(20), allowNull: false },
  data: { type: DataTypes.BLOB, allowNull: true },
  url: { type: DataTypes.TEXT, allowNull: true },
  publicId: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: "user_avatars" });

export default UserAvatar;
