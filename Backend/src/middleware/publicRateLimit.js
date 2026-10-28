const buckets = new Map();
let nextCleanupAt = 0;

export function publicRateLimit({ limit, windowMs, keyPrefix, keyGenerator = (req) => req.ip || "unknown" }) {
  return (req, res, next) => {
    const now = Date.now();
    if (now >= nextCleanupAt) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      nextCleanupAt = now + Math.min(windowMs, 60_000);
    }

    // In-memory per process; use a Redis/Postgres-backed store before running multiple instances.
    // When full, evict the oldest buckets instead of rejecting every caller.
    while (buckets.size >= 25_000) buckets.delete(buckets.keys().next().value);

    const key = `${keyPrefix}:${keyGenerator(req)}`;
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ status: "error", message: "Too many requests. Please try again later." });
    }
    return next();
  };
}
