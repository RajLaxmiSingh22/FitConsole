import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const migrationDirectory = fileURLToPath(new URL("../db/migrations/", import.meta.url));

export const BASELINE_MIGRATION = "202610290000_baseline.sql";
// The pre-baseline migrations folded into the baseline, in order.
export const LEGACY_MIGRATIONS = [
  "202610270001_website_leads_and_analytics.sql",
  "202610270002_cashfree_payment_review.sql",
  "202610270003_membership_pending_payment.sql",
  "202610270004_attendance_ist_uniqueness.sql",
  "202610270005_payment_void_audit.sql",
  "202610270006_reconcile_unpaid_memberships.sql",
  "202610280001_user_token_version.sql",
  "202610280002_payment_reminder_resolution.sql",
  "202610280003_refresh_tokens.sql",
  "202610280004_diet_profile_and_progress.sql",
  "202610280005_owner_analytics_indexes.sql",
  "202610280006_payment_invoice_numbers.sql",
  "202610280007_reminder_log.sql",
];

// Decides how to treat the baseline on this database: "run" it, mark it "applied", or "skip" because it is already recorded.
export function planBaseline({ applied, hasExistingSchema }) {
  if (applied.has(BASELINE_MIGRATION)) return "skip";
  if (!hasExistingSchema) return "run";
  const missing = LEGACY_MIGRATIONS.filter((name) => !applied.has(name));
  if (missing.length) {
    throw new Error(
      `This database predates the schema baseline and is missing ${missing.length} older migration(s), starting with ${missing[0]}. `
      + "Check out commit a59d7ee (the last release with individual migrations), run `npm run migrate`, then upgrade.",
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
