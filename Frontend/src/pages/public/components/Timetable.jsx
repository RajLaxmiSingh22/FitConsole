import { useMemo, useState } from "react";
import { LoadingState, Notice } from "../../../components/ui/index.js";
import { timeLabel, todayWeekday, weekdays } from "../../../constants/schedule.js";
import { useLoad } from "../../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../../services/api.js";

// Up to four program colours; the program name is always shown too, so colour is never the only cue.
const tones = ["red", "green", "yellow", "pink"];

const hourLabel = (hour) => `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
const firstName = (name = "") => name.split(/\s+/)[0];

// Public weekly timetable: an hour-by-day grid on wide screens, a one-day list on phones.
export default function Timetable() {
  const schedule = useLoad(async () => responseData(await apiCalls.schedule.list()));
  const sessions = useMemo(() => schedule.data ?? [], [schedule.data]);
  const today = todayWeekday();
  const [day, setDay] = useState(today);
  const [courseId, setCourseId] = useState("");
  const courses = useMemo(() => [...new Map(sessions.map((session) => [session.course.id, session.course])).values()], [sessions]);
  const toneOf = useMemo(() => new Map(courses.map((course, index) => [course.id, tones[index % tones.length]])), [courses]);
  const visible = courseId ? sessions.filter((session) => session.course.id === courseId) : sessions;

  if (schedule.loading && !schedule.data) return <LoadingState label="Loading the timetable…" />;
  if (schedule.error) return <Notice error={schedule.error} />;
  if (!sessions.length) {
    return <div className="public-unconfigured">The class timetable hasn't been published yet. Request a trial and the gym will share current class times.</div>;
  }

  const startHours = sessions.map((session) => Number(session.startTime.slice(0, 2)));
  const hours = Array.from({ length: Math.max(...startHours) - Math.min(...startHours) + 1 }, (_, index) => Math.min(...startHours) + index);
  const at = (weekday, hour) => visible.filter((session) => session.weekday === weekday && Number(session.startTime.slice(0, 2)) === hour);

  return <div className="tt">
    <div className="tt-toolbar">
      <div className="tt-filters" role="group" aria-label="Filter by program">
        <button type="button" className={courseId ? "" : "is-active"} aria-pressed={!courseId} onClick={() => setCourseId("")}>All programs</button>
        {courses.map((course) => <button key={course.id} type="button" className={`tt-tone-${toneOf.get(course.id)} ${courseId === course.id ? "is-active" : ""}`} aria-pressed={courseId === course.id} onClick={() => setCourseId(courseId === course.id ? "" : course.id)}>
          <i aria-hidden="true" />{course.name}
        </button>)}
      </div>
    </div>

    {/* Wide screens: classic timetable grid */}
    <div className="tt-grid-wrap">
      <table className="tt-grid">
        <caption className="sr-only">Weekly class timetable, times in IST</caption>
        <thead><tr>
          <th scope="col" className="tt-corner">Time</th>
          {weekdays.map(([value, name, short]) => <th scope="col" key={value} className={value === today ? "is-today" : ""}>
            <abbr title={name}>{short}</abbr>{value === today && <em>Today</em>}
          </th>)}
        </tr></thead>
        <tbody>{hours.map((hour) => <tr key={hour}>
          <th scope="row" className="tt-hour">{hourLabel(hour)}</th>
          {weekdays.map(([value]) => <td key={value} className={value === today ? "is-today" : ""}>
            {at(value, hour).map((session) => <a key={session.id} className={`tt-block tt-tone-${toneOf.get(session.course.id)}`} href={`/trial?courseId=${encodeURIComponent(session.course.id)}`} title={`${session.course.name} · ${timeLabel(session.startTime)}–${timeLabel(session.endTime)}${session.trainer ? ` · ${session.trainer.name}` : ""}${session.level ? ` · ${session.level}` : ""} — book a trial`}>
              <span className="tt-block-time">{timeLabel(session.startTime)}–{timeLabel(session.endTime)}</span>
              <b>{session.course.name}</b>
              <small>{session.trainer ? firstName(session.trainer.name) : "TBC"}{session.level && session.level !== "All levels" ? ` · ${session.level}` : ""}</small>
            </a>)}
          </td>)}
        </tr>)}</tbody>
      </table>
    </div>

    {/* Phones: one day at a time */}
    <div className="tt-mobile">
      <div className="tt-days" role="tablist" aria-label="Choose a day">
        {[...weekdays.slice(today - 1), ...weekdays.slice(0, today - 1)].map(([value, , short]) => <button key={value} type="button" role="tab" aria-selected={day === value} className={day === value ? "is-active" : ""} onClick={() => setDay(value)}>
          <b>{value === today ? "Today" : short}</b>
          <small>{visible.filter((session) => session.weekday === value).length || "Rest"}</small>
        </button>)}
      </div>
      <div className="tt-panel" role="tabpanel">
        {visible.filter((session) => session.weekday === day).map((session) => <a key={session.id} className={`tt-row tt-tone-${toneOf.get(session.course.id)}`} href={`/trial?courseId=${encodeURIComponent(session.course.id)}`}>
          <span className="tt-time">{timeLabel(session.startTime)}<small>– {timeLabel(session.endTime)}</small></span>
          <span className="tt-class"><b>{session.course.name}</b><small>{session.trainer ? `with ${session.trainer.name}` : "Trainer to be confirmed"}{session.level ? ` · ${session.level}` : ""}</small></span>
          <span className="tt-try">Try ↗</span>
        </a>)}
        {!visible.some((session) => session.weekday === day) && <p className="tt-empty">No classes on this day.</p>}
      </div>
    </div>

    <p className="timetable-note">Times are in IST. Tap a class to book a trial, and the gym will confirm your spot.</p>
  </div>;
}
