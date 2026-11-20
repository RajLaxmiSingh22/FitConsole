import { Sequelize } from "sequelize";
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendRoot, ".env") });
dotenv.config({ path: path.resolve(backendRoot, "../.env.local") });

const options = {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
};

function createSequelize(connectionString) {
  if (connectionString) return new Sequelize(connectionString, options);

  const requiredVariables = ["DB_NAME", "DB_USER", "DB_PASSWORD"];
  for (const variable of requiredVariables) {
    if (!process.env[variable]) {
      throw new Error(`${variable} or DATABASE_URL is required. Set it in Backend/.env.`);
    }
  }

  return new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    { ...options, host: process.env.DB_HOST ?? "localhost", port: Number(process.env.DB_PORT ?? 5432) },
  );
}

export const sequelize = createSequelize(process.env.DATABASE_URL);
export const createMigrationSequelize = () => (
  process.env.DATABASE_URL_UNPOOLED
    ? createSequelize(process.env.DATABASE_URL_UNPOOLED)
    : sequelize
);
