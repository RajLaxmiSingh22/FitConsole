import assert from "node:assert/strict";
import test from "node:test";
import { buildWebsiteAnalyticsSummary } from "../src/services/websiteAnalytics.js";

test("website analytics summary derives funnel counts and merges daily series", () => {
  const summary = buildWebsiteAnalyticsSummary({
    visits: 10,
    uniqueVisitors: "7",
    enrollments: 1,
    visitSeries: [{ date: "2026-10-02", visits: "6" }, { date: "2026-10-01", visits: "4" }],
    leadSeries: [{ date: "2026-10-01", leads: "3" }, { date: "2026-10-03", leads: "1" }],
    statusRows: [{ status: "new", count: "1" }, { status: "trial_confirmed", count: "1" }, { status: "trial_attended", count: "1" }, { status: "enrolled", count: "1" }],
    sourceRows: [{ source: "website", count: "4" }],
    programRows: [{ courseId: null, "Course.name": null, count: "4" }],
  }, { from: new Date("2026-10-01T00:00:00Z"), through: new Date("2026-10-03T00:00:00Z") });

  assert.equal(summary.websiteLeads, 4);
  assert.equal(summary.confirmedTrials, 2);
  assert.equal(summary.attendedTrials, 1);
  assert.equal(summary.visitToLeadRate, 40);
  assert.equal(summary.trialAttendanceRate, 50);
  assert.equal(summary.leadToEnrollmentRate, 25);
  assert.equal(summary.leadStatusDistribution.lost, 0);
  assert.deepEqual(summary.leadsByProgram, [{ courseId: null, program: "Unspecified", count: 4 }]);
  assert.deepEqual(summary.visitsAndLeadsOverTime.map((row) => [row.date, row.visits, row.leads]), [
    ["2026-10-01", 4, 3], ["2026-10-02", 6, 0], ["2026-10-03", 0, 1],
  ]);
  assert.equal(summary.to, "2026-10-03");
});
