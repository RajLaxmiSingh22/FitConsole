// ISO 8601 weekdays used by the class schedule: 1 = Monday ... 7 = Sunday.
export const weekdays = [
  [1, "Monday", "Mon"], [2, "Tuesday", "Tue"], [3, "Wednesday", "Wed"], [4, "Thursday", "Thu"],
  [5, "Friday", "Fri"], [6, "Saturday", "Sat"], [7, "Sunday", "Sun"],
];

export const classLevels = ["All levels", "Beginner", "Intermediate", "Advanced", "Kids", "Women only"];

// "18:30" → "6:30 PM"
export function timeLabel(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// Today's ISO weekday in gym time (IST).
export function todayWeekday(now = new Date()) {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(now);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name) + 1;
}
