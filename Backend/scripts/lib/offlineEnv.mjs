// Placeholder settings for code that loads the app modules but never connects to a database or
// sends anything (unit tests, docs generation). Real values from the environment or Backend/.env win.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (existsSync(path.join(backend, ".env"))) dotenv.config({ path: path.join(backend, ".env"), quiet: true });

const placeholders = {
  NODE_ENV: "test",
  DB_NAME: "fitconsole_test",
  DB_USER: "fitconsole_test",
  DB_PASSWORD: "not-a-real-password",
  DB_HOST: "localhost",
  JWT_SECRET: "test-only-secret-that-is-at-least-32-characters-long",
  RUN_JOBS: "false",
};
for (const [key, value] of Object.entries(placeholders)) {
  if (!process.env[key]) process.env[key] = value;
}

// A real test database for the tests that need one (see test/helpers/database.js).
if (process.env.TEST_DATABASE_URL) {
  const url = new URL(process.env.TEST_DATABASE_URL);
  process.env.DB_HOST = url.hostname;
  process.env.DB_PORT = url.port || "5432";
  process.env.DB_USER = decodeURIComponent(url.username);
  process.env.DB_PASSWORD = decodeURIComponent(url.password);
  process.env.DB_NAME = url.pathname.replace(/^\//, "");
}
