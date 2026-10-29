import assert from "node:assert/strict";
import test from "node:test";
import { resolveReportRange } from "../src/utils/reportRange.js";
import { reportRangeQuerySchema } from "../src/validation/index.js";

test("report ranges are IST days with an inclusive end and a 90-day default", () => {
  const range = resolveReportRange({ from: "2026-10-01", to: "2026-10-31" });
  assert.equal(range.start.toISOString(), "2026-09-30T18:30:00.000Z");
  assert.equal(range.end.toISOString(), "2026-10-31T18:30:00.000Z");
  const fallback = resolveReportRange({}, "2026-10-28");
  assert.deepEqual([fallback.from, fallback.to], ["2026-07-31", "2026-10-28"]);
});

test("report ranges reject inverted or over-366-day spans", () => {
  assert.match(resolveReportRange({ from: "2026-10-02", to: "2026-10-01" }).error, /before/);
  assert.equal(resolveReportRange({ from: "2025-10-27", to: "2026-10-28" }).error, "Date range cannot exceed 366 days.");
  assert.equal(resolveReportRange({ from: "2025-10-28", to: "2026-10-28" }).error, undefined);
  assert.ok(reportRangeQuerySchema.validate({ from: "28/10/2026" }).error);
});
