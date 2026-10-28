import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const migrationDirectory = fileURLToPath(new URL("../db/migrations/", import.meta.url));

export async function runMigrations(database) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS "fitconsole_migrations" (
      "name" VARCHAR(255) PRIMARY KEY,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const names = (await readdir(migrationDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of names) {
    await database.transaction(async (transaction) => {
      await database.query(
        "SELECT pg_advisory_xact_lock(hashtext(:name))",
        { replacements: { name: `fitconsole-migration:${name}` }, transaction },
      );
      const [existing] = await database.query(
        'SELECT "name" FROM "fitconsole_migrations" WHERE "name" = :name',
        { replacements: { name }, transaction },
      );
      if (existing.length) return;

      const sql = await readFile(path.join(migrationDirectory, name), "utf8");
      await database.query(sql, { transaction });
      await database.query(
        'INSERT INTO "fitconsole_migrations" ("name") VALUES (:name)',
        { replacements: { name }, transaction },
      );
    });
    console.info(`Applied database migration ${name}.`);
  }
}
