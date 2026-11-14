import assert from "node:assert/strict";
import { after } from "node:test";
import { databaseTest, hasTestDatabase } from "./helpers/database.js";

// Real-database checks for the migration runner. Skipped unless TEST_DATABASE_URL is set.
const { sequelize } = hasTestDatabase ? await import("../src/database.js") : {};
after(async () => { await sequelize?.close(); });

databaseTest("the baseline builds the full schema on an empty database, and a second run does nothing", async () => {
  const { BASELINE_MIGRATION, runMigrations } = await import("../src/runMigrations.js");
  await runMigrations(sequelize);
  const [[{ count }]] = await sequelize.query("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name <> 'fitconsole_migrations'");
  assert.equal(count, 38);
  const [first] = await sequelize.query("select name, applied_at from fitconsole_migrations order by name");
  assert.ok(first.some((row) => row.name === BASELINE_MIGRATION));
  await runMigrations(sequelize);
  const [second] = await sequelize.query("select name, applied_at from fitconsole_migrations order by name");
  assert.deepEqual(second, first);
});

databaseTest("models match the baseline schema for every table they use", async () => {
  const models = await import("../src/models/index.js");
  for (const model of Object.values(models).filter((value) => value?.getTableName)) {
    const columns = await sequelize.getQueryInterface().describeTable(model.getTableName());
    for (const attribute of Object.values(model.getAttributes())) {
      assert.ok(columns[attribute.field], `${model.name}.${attribute.fieldName} → column ${attribute.field} is missing in ${model.getTableName()}`);
    }
  }
});
