// Loaded before every test file (npm test uses `node --import ./test/setup.js --test`), so tests run on a
// fresh clone without Backend/.env. Unit tests never connect to a database; tests that need one use
// test/helpers/database.js and are skipped unless TEST_DATABASE_URL is set.
import "../scripts/lib/offlineEnv.mjs";
