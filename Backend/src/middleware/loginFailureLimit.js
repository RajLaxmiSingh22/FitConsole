import { createHash } from "node:crypto";

// In-memory per process. A Redis/Postgres-backed store is required before running multiple instances.
const failures = new Map();
const maxEntries = 25_000;

export function loginAccountKey(email) {
  return createHash("sha256").update(String(email ?? "").trim().toLowerCase()).digest("hex");
}

export function createLoginFailureLimiter({ limit = 10, windowMs = 15 * 60 * 1000, store = failures, now = Date.now } = {}) {
  return {
    retryAfterSeconds(email) {
      const entry = store.get(loginAccountKey(email));
      const current = now();
      if (!entry || entry.resetAt <= current) return 0;
      return entry.count >= limit ? Math.max(1, Math.ceil((entry.resetAt - current) / 1000)) : 0;
    },
    recordFailure(email) {
      const key = loginAccountKey(email);
      const current = now();
      const existing = store.get(key);
      const entry = !existing || existing.resetAt <= current ? { count: 0, resetAt: current + windowMs } : existing;
      entry.count += 1;
      store.delete(key);
      store.set(key, entry);
      while (store.size > maxEntries) store.delete(store.keys().next().value);
    },
    reset(email) {
      store.delete(loginAccountKey(email));
    },
  };
}

export const loginFailureLimiter = createLoginFailureLimiter();
