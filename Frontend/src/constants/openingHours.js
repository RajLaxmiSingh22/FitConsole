// FitConsole opening hours (gym-local IST), as provided by the gym owner.
// ISO weekday → [opens, closes] in 24-hour HH:MM.
export const openingHours = {
  1: ["06:00", "23:00"],
  2: ["06:00", "23:00"],
  3: ["06:00", "23:00"],
  4: ["06:00", "23:00"],
  5: ["06:00", "23:00"],
  6: ["06:00", "23:00"],
  7: ["06:00", "18:00"],
};

// Grouped rows for display, e.g. Monday – Saturday · 6:00 AM – 11:00 PM.
export const openingHoursSummary = [
  ["Monday – Saturday", "6:00 AM – 11:00 PM"],
  ["Sunday", "6:00 AM – 6:00 PM"],
];

export const openingHoursSentence = "FitConsole is open Monday to Saturday from 6:00 AM to 11:00 PM, and Sunday from 6:00 AM to 6:00 PM.";

// Whether an HH:MM slot on an ISO weekday fits inside opening hours.
export function withinOpeningHours(weekday, startTime, endTime) {
  const hours = openingHours[weekday];
  return Boolean(hours) && startTime >= hours[0] && endTime <= hours[1];
}

// Open right now in gym time (IST)?
export function isOpenNow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  const time = `${parts.hour}:${parts.minute}`;
  const [opens, closes] = openingHours[weekday] ?? [];
  return Boolean(opens) && time >= opens && time < closes;
}
