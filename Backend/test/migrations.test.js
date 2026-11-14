import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import { BASELINE_MIGRATION, INTERIM_BASELINES, LEGACY_MIGRATIONS, planBaseline } from "../src/runMigrations.js";

test("schema baseline runs on an empty database", () => {
  assert.equal(planBaseline({ applied: new Set(), hasExistingSchema: false }), "run");
});

test("schema baseline is only recorded on a database that applied every legacy migration", () => {
  assert.equal(planBaseline({ applied: new Set(LEGACY_MIGRATIONS), hasExistingSchema: true }), "applied");
  assert.equal(planBaseline({ applied: new Set([BASELINE_MIGRATION]), hasExistingSchema: true }), "skip");
  // A database that recorded the interim 202611140003 baseline already has the full schema.
  assert.equal(planBaseline({ applied: new Set([...LEGACY_MIGRATIONS, ...INTERIM_BASELINES]), hasExistingSchema: true }), "applied");
  assert.equal(planBaseline({ applied: new Set(INTERIM_BASELINES), hasExistingSchema: true }), "applied");
});

test("schema baseline refuses a partially migrated legacy database", () => {
  assert.throws(
    () => planBaseline({ applied: new Set(LEGACY_MIGRATIONS.slice(0, 3)), hasExistingSchema: true }),
    /missing 12 older migration\(s\), starting with 202611040003_waiver_documents\.sql/,
  );
  // A pre-migration database created only by sequelize.sync() has tables but no recorded migrations.
  assert.throws(() => planBaseline({ applied: new Set(), hasExistingSchema: true }), /predates the schema baseline/);
});

test("a database on the previous baseline alone is refused with a clear message", () => {
  assert.throws(
    () => planBaseline({ applied: new Set(["202610290000_baseline.sql"]), hasExistingSchema: true }),
    /missing 14 older migration\(s\), starting with 202611040001_email_log\.sql/,
  );
});

test("folded migrations are no longer shipped, and the baseline sorts first", async () => {
  const files = (await readdir(new URL("../db/migrations/", import.meta.url))).filter((name) => name.endsWith(".sql")).sort();
  assert.equal(files[0], BASELINE_MIGRATION);
  assert.deepEqual(files.filter((name) => LEGACY_MIGRATIONS.includes(name)), []);
});
