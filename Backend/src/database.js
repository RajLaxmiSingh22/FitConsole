import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const requiredVariables = ["DB_NAME", "DB_USER", "DB_PASSWORD"];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`${variable} is required. Set it in Backend/.env.`);
  }
}

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    dialect: "postgres",
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
  },
);
