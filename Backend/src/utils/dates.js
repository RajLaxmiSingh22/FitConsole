const gymTimeZone = () => process.env.GYM_TIMEZONE ?? "Asia/Kolkata";

export function todayInGymTz(date = new Date(), timeZone = gymTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDaysToDateString(dateString, days) {
  return new Date(new Date(`${dateString}T00:00:00.000Z`).getTime() + days * 86400000)
    .toISOString().slice(0, 10);
}

function offsetMinutes(date, timeZone) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date).find((part) => part.type === "timeZoneName").value;
  const match = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

export function startOfDayInGymTz(dateString, timeZone = gymTimeZone()) {
  const utcMidnight = new Date(`${dateString}T00:00:00.000Z`);
  return new Date(utcMidnight.getTime() - offsetMinutes(utcMidnight, timeZone) * 60000);
}

export function startOfMonthInGymTz(date = new Date(), timeZone = gymTimeZone()) {
  return startOfDayInGymTz(`${todayInGymTz(date, timeZone).slice(0, 8)}01`, timeZone);
}

export function dayRangeInGymTz(dateString, timeZone = gymTimeZone()) {
  return {
    start: startOfDayInGymTz(dateString, timeZone),
    end: startOfDayInGymTz(addDaysToDateString(dateString, 1), timeZone),
  };
}
