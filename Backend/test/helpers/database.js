import test from "node:test";

// Registers a test that needs a real PostgreSQL database. It runs only when TEST_DATABASE_URL points at a
// dedicated, disposable test database (CI provides one); otherwise it is skipped with a clear message.
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

export function databaseTest(name, fn) {
  return test(name, {
    skip: hasTestDatabase ? false : "needs a test PostgreSQL database: set TEST_DATABASE_URL=postgres://user:pass@host:5432/dbname (a disposable database)",
  }, fn);
}
