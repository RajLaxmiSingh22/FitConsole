import { Op, fn, col } from "sequelize";
import { AnalyticsEvent, Course, WebsiteLead } from "../models/index.js";
import { leadStatuses } from "../utils/leadWorkflow.js";

// Buckets created_at into a UTC calendar day, matching the UTC range used by the summary endpoint.
const utcDay = (column) => fn("to_char", fn("date_trunc", "day", fn("timezone", "UTC", col(column))), "YYYY-MM-DD");

function percent(numerator, denominator) {
  return denominator === 0 ? null : Number(((numerator / denominator) * 100).toFixed(2));
}

// Runs the aggregate queries for website visits and leads created in [from, to).
export async function fetchWebsiteAnalytics({ from, to }, models = { AnalyticsEvent, Course, WebsiteLead }) {
  const createdAt = { [Op.gte]: from, [Op.lt]: to };
  const pageViews = { type: "page_view", createdAt };
  const leadsInRange = { createdAt };

  const [visits, uniqueVisitors, visitSeries, leadSeries, statusRows, sourceRows, programRows, enrollments] = await Promise.all([
    models.AnalyticsEvent.count({ where: pageViews, distinct: true, col: "sessionId" }),
    models.AnalyticsEvent.count({ where: pageViews, distinct: true, col: "visitorId" }),
    models.AnalyticsEvent.findAll({
      attributes: [[utcDay("created_at"), "date"], [fn("COUNT", fn("DISTINCT", col("session_id"))), "visits"]],
      where: pageViews,
      group: ["date"],
      order: [[col("date"), "ASC"]],
      raw: true,
    }),
    models.WebsiteLead.findAll({
      attributes: [[utcDay("created_at"), "date"], [fn("COUNT", col("id")), "leads"]],
      where: leadsInRange,
      group: ["date"],
      order: [[col("date"), "ASC"]],
      raw: true,
    }),
    models.WebsiteLead.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      where: leadsInRange,
      group: ["status"],
      raw: true,
    }),
    models.WebsiteLead.findAll({
      attributes: ["source", [fn("COUNT", col("id")), "count"]],
      where: leadsInRange,
      group: ["source"],
      order: [[col("count"), "DESC"]],
      raw: true,
    }),
    models.WebsiteLead.findAll({
      attributes: ["courseId", [fn("COUNT", col("WebsiteLead.id")), "count"]],
      include: [{ model: models.Course, attributes: ["name"], required: false }],
      where: { createdAt: { [Op.gte]: from, [Op.lt]: to } },
      group: ["WebsiteLead.course_id", "Course.id", "Course.name"],
      order: [[col("count"), "DESC"]],
      raw: true,
    }),
    models.WebsiteLead.count({ where: { ...leadsInRange, status: "enrolled", clientId: { [Op.ne]: null } } }),
  ]);

  return { visits, uniqueVisitors, visitSeries, leadSeries, statusRows, sourceRows, programRows, enrollments };
}

// Shapes the aggregate rows into the API response; funnel stages share the same lead-creation cohort.
export function buildWebsiteAnalyticsSummary(rows, { from, through }) {
  const statusCounts = Object.fromEntries(rows.statusRows.map((row) => [row.status, Number(row.count)]));
  const statuses = Object.fromEntries(leadStatuses.map((status) => [status, statusCounts[status] ?? 0]));
  const totalVisits = Number(rows.visits ?? 0);
  const totalLeads = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const confirmedTrials = (statusCounts.trial_confirmed ?? 0) + (statusCounts.trial_attended ?? 0);
  const attendedTrials = statusCounts.trial_attended ?? 0;
  const enrollments = Number(rows.enrollments ?? 0);

  const byDate = new Map();
  for (const row of rows.visitSeries) {
    byDate.set(row.date, { date: row.date, visits: Number(row.visits), leads: 0 });
  }
  for (const row of rows.leadSeries) {
    const current = byDate.get(row.date) ?? { date: row.date, visits: 0, leads: 0 };
    current.leads = Number(row.leads);
    byDate.set(row.date, current);
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: through.toISOString().slice(0, 10),
    totalVisits,
    uniqueVisitors: Number(rows.uniqueVisitors ?? 0),
    websiteLeads: totalLeads,
    trialBookings: totalLeads,
    confirmedTrials,
    attendedTrials,
    websiteEnrollments: enrollments,
    visitToLeadRate: percent(totalLeads, totalVisits),
    trialAttendanceRate: percent(attendedTrials, confirmedTrials),
    leadToEnrollmentRate: percent(enrollments, totalLeads),
    leadsBySource: rows.sourceRows.map((row) => ({ source: row.source, count: Number(row.count) })),
    leadsByProgram: rows.programRows.map((row) => ({
      courseId: row.courseId,
      program: row["Course.name"] ?? "Unspecified",
      count: Number(row.count),
    })),
    visitsAndLeadsOverTime: [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date)),
    leadStatusDistribution: statuses,
    conversionFunnel: {
      visits: totalVisits,
      leads: totalLeads,
      confirmedTrials,
      attendedTrials,
      enrollments,
    },
  };
}
