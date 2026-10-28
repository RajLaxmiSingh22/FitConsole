import Joi from "joi";
import { addDaysToDateString, startOfDayInGymTz, todayInGymTz } from "./dates.js";

const MAX_RANGE_DAYS = 366;
const isoDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({ "string.pattern.base": "{#label} must be a YYYY-MM-DD date" });

export const reportRangeQuerySchema = Joi.object({ from: isoDate, to: isoDate });

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

// Resolves gym-local (IST) report dates into UTC instants; `to` is inclusive. Defaults to the last 90 days.
export function resolveReportRange(query = {}, today = todayInGymTz()) {
  const to = query.to ?? today;
  const from = query.from ?? addDaysToDateString(to, -89);
  if (Number.isNaN(Date.parse(`${from}T00:00:00Z`)) || Number.isNaN(Date.parse(`${to}T00:00:00Z`))) {
    return { error: "Enter valid from and to dates." };
  }
  if (from > to) return { error: "\"from\" must be on or before \"to\"." };
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) return { error: `Date range cannot exceed ${MAX_RANGE_DAYS} days.` };
  return {
    from,
    to,
    start: startOfDayInGymTz(from),
    end: startOfDayInGymTz(addDaysToDateString(to, 1)),
    timeZone: process.env.GYM_TIMEZONE ?? "Asia/Kolkata",
  };
}
