import { useState } from "react";
import { LoadingState, Notice } from "../ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../services/api.js";

const time = (value) => (value ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value)) : "—");
const shiftMonth = (month, delta) => {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
};
const symbol = { attended: "✓", missed: "✕", pending: "•", upcoming: "", rest: "" };

export default function AttendanceCalendar({ clientId }) {
  const thisMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()).slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [selected, setSelected] = useState(null);
  const calendar = useLoad(async () => responseData(await apiCalls.clients.analyticsCalendar(clientId, month)), [clientId, month]);
  const days = calendar.data?.days ?? [];
  const leading = days.length ? (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const title = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  return <div className="cal">
    <div className="cal-head">
      <button type="button" className="icon-button" onClick={() => { setMonth(shiftMonth(month, -1)); setSelected(null); }} aria-label="Previous month">‹</button>
      <b>{title}</b>
      <button type="button" className="icon-button" onClick={() => { setMonth(shiftMonth(month, 1)); setSelected(null); }} disabled={month >= thisMonth} aria-label="Next month">›</button>
    </div>
    <Notice error={calendar.error} />
    {calendar.loading && !calendar.data ? <LoadingState label="Loading calendar…" /> : <>
      <div className="cal-grid" role="grid" aria-label={`Attendance in ${title}`}>
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}${index}`} className="cal-weekday" aria-hidden="true">{day}</span>)}
        {Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} />)}
        {days.map((day) => <button key={day.date} type="button" role="gridcell" className={`cal-day is-${day.status} ${selected?.date === day.date ? "is-selected" : ""}`} onClick={() => setSelected(day)} aria-label={`${day.date}: ${day.status}`}>
          <span>{Number(day.date.slice(8))}</span><i aria-hidden="true">{symbol[day.status]}</i>
        </button>)}
      </div>
      <div className="cal-legend"><span className="is-attended">✓ Attended</span><span className="is-missed">✕ Missed</span><span className="is-rest">Rest / not planned</span></div>
      {selected && <p className="cal-detail" role="status">
        <b>{new Date(`${selected.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</b>
        {selected.visits.length ? selected.visits.map((visit) => <span key={visit.checkedInAt}>Checked in {time(visit.checkedInAt)} · out {time(visit.checkedOutAt)}</span>)
          : <span>{selected.status === "missed" ? "Planned session missed." : selected.status === "rest" ? "Rest day." : "No visit recorded."}</span>}
      </p>}
    </>}
  </div>;
}
