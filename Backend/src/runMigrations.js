import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const migrationDirectory = fileURLToPath(new URL("../db/migrations/", import.meta.url));

export const BASELINE_MIGRATION = "000_baseline.sql";
// An interim baseline that held the same schema; a database that recorded it is fully migrated.
export const INTERIM_BASELINES = ["202611140003_schema_baseline.sql"];
// Everything folded into the current baseline, in order. A database with existing tables must have
// applied all of these before the baseline can be recorded in their place.
export const LEGACY_MIGRATIONS = [
  "202610290000_baseline.sql",
  "202611040001_email_log.sql",
  "202611040002_cashfree_payment_session_repair.sql",
  "202611040003_waiver_documents.sql",
  "202611050001_analytics_event_optional_ids.sql",
  "202611050002_class_sessions.sql",
  "202611060001_trainer_public_profile.sql",
  "202611060002_progress_entries_client_fk_repair.sql",
  "202611060003_member_analytics.sql",
  "202611060004_client_training_days.sql",
  "202611070001_courses_age_level_guardian.sql",
  "202611080001_client_fitness_profile.sql",
  "202611090001_user_avatars.sql",
  "202611140001_cloudinary_media.sql",
  "202611140002_course_covers.sql",
];

// Decides how to treat the baseline on this database: "run" it, mark it "applied", or "skip" because it is already recorded.
export function planBaseline({ applied, hasExistingSchema }) {
  if (applied.has(BASELINE_MIGRATION)) return "skip";
  if (!hasExistingSchema) return "run";
  if (INTERIM_BASELINES.some((name) => applied.has(name))) return "applied";
  const missing = LEGACY_MIGRATIONS.filter((name) => !applied.has(name));
  if (missing.length) {
    throw new Error(
      `This database predates the schema baseline and is missing ${missing.length} older migration(s), starting with ${missing[0]}. `
      + "Check out the last release that still has the individual migration files, run `npm run migrate`, then upgrade.",
    );
  }
  return "applied";
}

async function recordMigration(database, name, transaction) {
  await database.query(
    'INSERT INTO "fitconsole_migrations" ("name") VALUES (:name)',
    { replacements: { name }, transaction },
  );
}

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
      const [rows] = await database.query('SELECT "name" FROM "fitconsole_migrations"', { transaction });
      const applied = new Set(rows.map((row) => row.name));
      if (applied.has(name)) return;

      if (name === BASELINE_MIGRATION) {
        const [[{ exists }]] = await database.query(
          "SELECT to_regclass('public.users') IS NOT NULL AS \"exists\"",
          { transaction },
        );
        const plan = planBaseline({ applied, hasExistingSchema: exists });
        if (plan === "applied") {
          await recordMigration(database, name, transaction);
          console.info(`Recorded schema baseline ${name}; this database already has the full schema.`);
          return;
        }
      }

      const sql = await readFile(path.join(migrationDirectory, name), "utf8");
      await database.query(sql, { transaction });
      await recordMigration(database, name, transaction);
      console.info(`Applied database migration ${name}.`);
    });
  }
}
