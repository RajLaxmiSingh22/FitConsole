import { AnalyticsEvent } from "../models/index.js";
import { buildWebsiteAnalyticsSummary, fetchWebsiteAnalytics } from "../services/websiteAnalytics.js";

function toUtcDate(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
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
    const rows = await fetchWebsiteAnalytics({ from, to: toExclusive });
    return res.json({ status: "success", data: buildWebsiteAnalyticsSummary(rows, { from, through }) });
  } catch (error) {
    console.error("Website analytics summary failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve website analytics." });
  }
}
