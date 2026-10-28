import { QueryTypes } from "sequelize";
import { sequelize } from "../database.js";
import { AnalyticsEvent } from "../models/index.js";
import { leadStatuses } from "../utils/leadWorkflow.js";

function toUtcDate(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function percent(numerator, denominator) {
  return denominator === 0 ? null : Number(((numerator / denominator) * 100).toFixed(2));
}

function acceptedSource(value, hasCampaign) {
  if (hasCampaign) return "campaign";
  if (value === "referral") return "referral";
  if (value === "direct") return "direct";
  return "website";
}

export async function collectPublicEvent(req, res) {
  if (req.user) return res.status(204).end();
  const value = req.validated.body;
  if (!value.consent) return res.status(204).end();
  if (!value.page.startsWith("/") || value.page.startsWith("//") || /[?#]/.test(value.page)) {
    return res.status(400).json({ status: "error", message: "Page must be a same-site path without query data." });
  }

  try {
    await AnalyticsEvent.findOrCreate({
      where: { eventId: value.eventId },
      defaults: {
        eventId: value.eventId,
        visitorId: value.visitorId,
        sessionId: value.sessionId,
        type: value.type,
        page: value.page,
        source: acceptedSource(value.source, Boolean(value.utmSource || value.utmMedium || value.utmCampaign)),
        utmSource: value.utmSource || null,
        utmMedium: value.utmMedium || null,
        utmCampaign: value.utmCampaign || null,
      },
    });
    return res.status(202).json({ status: "success", data: { accepted: true } });
  } catch (error) {
    console.error("Public analytics event failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to record analytics event." });
  }
}

export async function getAnalyticsSummary(req, res) {
  const from = toUtcDate(req.validated.query.from);
  const through = toUtcDate(req.validated.query.to);
  const toExclusive = new Date(through);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  try {
    const replacements = { from, to: toExclusive };
    const [
      [visitCounts],
      eventSeries,
      leadSeries,
      statusRows,
      sourceRows,
      programRows,
    ] = await Promise.all([
      sequelize.query(
        `SELECT COUNT(DISTINCT session_id) FILTER (WHERE type = 'page_view') AS visits,
                COUNT(DISTINCT visitor_id) FILTER (WHERE type = 'page_view') AS unique_visitors
         FROM analytics_events
         WHERE created_at >= :from AND created_at < :to`,
        { replacements, type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
                COUNT(DISTINCT session_id) FILTER (WHERE type = 'page_view') AS visits
         FROM analytics_events
         WHERE created_at >= :from AND created_at < :to
         GROUP BY date
         ORDER BY date`,
        { replacements, type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
                COUNT(*) AS leads
         FROM website_leads
         WHERE created_at >= :from AND created_at < :to
         GROUP BY date
         ORDER BY date`,
        { replacements, type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT status, COUNT(*) AS count
         FROM website_leads
         WHERE created_at >= :from AND created_at < :to
         GROUP BY status`,
        { replacements, type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT source, COUNT(*) AS count
         FROM website_leads
         WHERE created_at >= :from AND created_at < :to
         GROUP BY source
         ORDER BY count DESC`,
        { replacements, type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT l.course_id AS "courseId", COALESCE(c.name, 'Unspecified') AS name, COUNT(*) AS count
         FROM website_leads l
         LEFT JOIN courses c ON c.id = l.course_id
         WHERE l.created_at >= :from AND l.created_at < :to
         GROUP BY l.course_id, c.name
         ORDER BY count DESC`,
        { replacements, type: QueryTypes.SELECT },
      ),
    ]);

    // Counts below use explicit SQL predicates to keep each funnel stage in the same booking cohort.
    const [leadCounts] = await sequelize.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status IN ('trial_confirmed', 'trial_attended')) AS confirmed,
              COUNT(*) FILTER (WHERE status = 'trial_attended') AS attended,
              COUNT(*) FILTER (WHERE status = 'enrolled' AND client_id IS NOT NULL) AS enrolled
       FROM website_leads
       WHERE created_at >= :from AND created_at < :to`,
      { replacements, type: QueryTypes.SELECT },
    );
    const visitTotal = Number(visitCounts.visits ?? 0);
    const uniqueVisitors = Number(visitCounts.unique_visitors ?? 0);
    const totalLeads = Number(leadCounts.total ?? 0);
    const confirmedTrials = Number(leadCounts.confirmed ?? 0);
    const attendedTrials = Number(leadCounts.attended ?? 0);
    const enrollments = Number(leadCounts.enrolled ?? 0);
    const statusCounts = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.count)]));
    const statuses = Object.fromEntries(leadStatuses.map((status) => [status, statusCounts[status] ?? 0]));
    const byDate = new Map();
    for (const row of eventSeries) {
      byDate.set(row.date, { date: row.date, visits: Number(row.visits), leads: 0 });
    }
    for (const row of leadSeries) {
      const current = byDate.get(row.date) ?? { date: row.date, visits: 0, leads: 0 };
      current.leads = Number(row.leads);
      byDate.set(row.date, current);
    }

    return res.json({
      status: "success",
      data: {
        from: from.toISOString().slice(0, 10),
        to: new Date(through).toISOString().slice(0, 10),
        totalVisits: visitTotal,
        uniqueVisitors,
        websiteLeads: totalLeads,
        trialBookings: totalLeads,
        confirmedTrials,
        attendedTrials,
        websiteEnrollments: enrollments,
        visitToLeadRate: percent(totalLeads, visitTotal),
        trialAttendanceRate: percent(attendedTrials, confirmedTrials),
        leadToEnrollmentRate: percent(enrollments, totalLeads),
        leadsBySource: sourceRows.map((row) => ({ source: row.source, count: Number(row.count) })),
        leadsByProgram: programRows.map((row) => ({
          courseId: row.courseId,
          program: row.name,
          count: Number(row.count),
        })),
        visitsAndLeadsOverTime: [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date)),
        leadStatusDistribution: statuses,
        conversionFunnel: {
          visits: visitTotal,
          leads: totalLeads,
          confirmedTrials,
          attendedTrials,
          enrollments,
        },
      },
    });
  } catch (error) {
    console.error("Website analytics summary failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve website analytics." });
  }
}
