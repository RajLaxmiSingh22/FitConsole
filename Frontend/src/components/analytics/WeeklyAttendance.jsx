// Mon–Sun strip: colour plus a symbol and text label, so status never depends on colour alone.
const marks = { attended: ["✓", "Attended"], missed: ["✕", "Missed"], pending: ["•", "Today"], upcoming: ["○", "Planned"], rest: ["–", "Rest"] };
const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyAttendance({ week }) {
  return <ol className="week-strip" aria-label="This week's attendance">
    {week.map((day) => {
      const [symbol, label] = marks[day.status] ?? marks.rest;
      return <li key={day.date} className={`week-day is-${day.status} ${day.isToday ? "is-today" : ""}`} title={`${names[day.weekday - 1]} ${day.date}: ${label}`}>
        <span className="week-day-name">{names[day.weekday - 1]}</span>
        <span className="week-day-mark" aria-hidden="true">{symbol}</span>
        <span className="week-day-label">{day.isToday && day.status !== "attended" ? "Today" : label}</span>
      </li>;
    })}
  </ol>;
}
