import { Button } from "../ui/index.js";
import { dateLabel } from "../../utils/format.js";
import WeeklyAttendance from "./WeeklyAttendance.jsx";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Next planned training day from the week strip (today if not yet attended).
function nextSession(week) {
  const next = week.find((day) => day.status === "pending" || day.status === "upcoming");
  if (!next) return "Next week";
  return next.status === "pending" ? "Today" : dayNames[next.weekday - 1];
}

export default function StreakCard({ analytics, onOpen }) {
  const { attendance, week } = analytics;
  const thisWeek = week.filter((day) => day.status === "attended").length;
  const planned = week.filter((day) => day.status !== "rest").length;
  return <section className="streak-card" aria-label="Attendance streak">
    <button type="button" className="streak-hero" onClick={onOpen} aria-label={`Current streak ${attendance.currentStreak} sessions. Open full analytics`}>
      <span className="overline">CURRENT STREAK</span>
      <strong>{attendance.currentStreak}<small>{attendance.currentStreak === 1 ? "session" : "sessions"}</small></strong>
      <span className="streak-best">Best: {attendance.longestStreak}</span>
    </button>
    <div className="streak-body">
      <div className="streak-stats">
        <div><b>{attendance.allTimeVisits}</b><small>Total visits</small></div>
        <div><b>{attendance.attendancePercentage == null ? "—" : `${attendance.attendancePercentage}%`}</b><small>Attendance (30 days)</small></div>
        <div><b>{thisWeek}/{planned}</b><small>This week</small></div>
        <div><b>{attendance.lastVisit ? dateLabel(attendance.lastVisit, { day: "numeric", month: "short" }) : "—"}</b><small>Last visit</small></div>
        <div><b>{nextSession(week)}</b><small>Next session</small></div>
      </div>
      <WeeklyAttendance week={week} />
      <Button className="streak-cta" onClick={onOpen}>View Full Analytics →</Button>
    </div>
  </section>;
}
