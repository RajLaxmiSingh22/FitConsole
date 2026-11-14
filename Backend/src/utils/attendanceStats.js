// Shared attendance and streak calculations used by the client, trainer and owner analytics views.
// All dates are gym-local (IST) YYYY-MM-DD strings; weekdays are ISO 8601 (1 = Monday ... 7 = Sunday).
import { addDaysToDateString } from "./dates.js";

export function isoWeekday(date) {
  return ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

// Days a member was expected to train: inside a membership period, on a weekday their course runs,
// and not a day the gym is closed. Any visit still counts, even on an unscheduled day.
export function buildSchedule({ periods = [], weekdays = new Set(), closedDates = new Set() }) {
  return (date) => !closedDates.has(date)
    && weekdays.has(isoWeekday(date))
    && periods.some(({ start, end }) => date >= start && date <= end);
}

// attended | missed | pending (scheduled today, not in yet) | upcoming | rest
export function dayStatus(date, { attended, isScheduled, today }) {
  if (attended.has(date)) return "attended";
  if (!isScheduled(date)) return "rest";
  if (date < today) return "missed";
  return date === today ? "pending" : "upcoming";
}

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * @param {object} input
 * @param {Iterable<string>} input.attendedDates  verified check-in days (duplicates are ignored)
 * @param {(date: string) => boolean} input.isScheduled  from buildSchedule
 * @param {string} input.today  gym-local date
 * @param {string} [input.from] start of the reporting window (defaults to the first visit or period)
 */
export function computeAttendanceStats({ attendedDates, isScheduled, today, from }) {
  const attended = new Set([...attendedDates].filter((date) => date <= today));
  const visits = [...attended].sort();
  const start = from ?? visits[0] ?? today;

  let streak = 0;
  let longestStreak = 0;
  let scheduledSessions = 0;
  let attendedScheduled = 0;
  let missedSessions = 0;
  const missedDates = [];
  for (let date = start; date <= today; date = addDaysToDateString(date, 1)) {
    const status = dayStatus(date, { attended, isScheduled, today });
    if (status === "attended") {
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
      if (isScheduled(date)) { scheduledSessions += 1; attendedScheduled += 1; }
    } else if (status === "missed") {
      streak = 0;
      scheduledSessions += 1;
      missedSessions += 1;
      missedDates.push(date);
    }
    // rest and pending days neither extend nor break the streak.
  }

  const windowVisits = visits.filter((date) => date >= start);
  const weeks = Math.max(1, (daysBetween(start, today) + 1) / 7);
  return {
    currentStreak: streak,
    longestStreak,
    totalVisits: windowVisits.length,
    scheduledSessions,
    attendedScheduled,
    missedSessions,
    missedDates,
    attendancePercentage: scheduledSessions ? Math.round((attendedScheduled / scheduledSessions) * 100) : null,
    averageVisitsPerWeek: Number((windowVisits.length / weeks).toFixed(1)),
    firstVisit: windowVisits[0] ?? null,
    lastVisit: windowVisits.at(-1) ?? null,
  };
}

// Monday-to-Sunday strip for the week containing `today`.
export function weekStrip({ attendedDates, isScheduled, today }) {
  const attended = new Set(attendedDates);
  const monday = addDaysToDateString(today, 1 - isoWeekday(today));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateString(monday, index);
    return { date, weekday: index + 1, isToday: date === today, status: dayStatus(date, { attended, isScheduled, today }) };
  });
}

// One status per day of a month ("YYYY-MM"), for the calendar view.
export function monthCalendar({ month, attendedDates, isScheduled, today }) {
  const attended = new Set(attendedDates);
  const first = `${month}-01`;
  const days = [];
  for (let date = first; date.startsWith(month); date = addDaysToDateString(date, 1)) {
    days.push({ date, status: dayStatus(date, { attended, isScheduled, today }) });
  }
  return days;
}
