import assert from "node:assert/strict";
import test from "node:test";
import { BASELINE_MIGRATION, LEGACY_MIGRATIONS, planBaseline } from "../src/runMigrations.js";

test("schema baseline runs on an empty database", () => {
  assert.equal(planBaseline({ applied: new Set(), hasExistingSchema: false }), "run");
});

test("schema baseline is only recorded on a database that applied every legacy migration", () => {
  assert.equal(planBaseline({ applied: new Set(LEGACY_MIGRATIONS), hasExistingSchema: true }), "applied");
  assert.equal(planBaseline({ applied: new Set([BASELINE_MIGRATION]), hasExistingSchema: true }), "skip");
});

test("schema baseline refuses a partially migrated legacy database", () => {
  assert.throws(
    () => planBaseline({ applied: new Set(LEGACY_MIGRATIONS.slice(0, 3)), hasExistingSchema: true }),
    /missing 10 older migration\(s\), starting with 202610270004_attendance_ist_uniqueness\.sql/,
  );
  // A pre-migration database created only by sequelize.sync() has tables but no recorded migrations.
  assert.throws(() => planBaseline({ applied: new Set(), hasExistingSchema: true }), /predates the schema baseline/);
});
