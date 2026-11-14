import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, StatusPill } from "../../components/ui/index.js";
import { METHOD_LABELS } from "../../constants/reports.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { isoDaysAgo, monthLabel } from "../../utils/dates.js";
import { currency, dateLabel } from "../../utils/format.js";

// Single-series horizontal bars: one hue, value printed as text beside each bar, so no legend is needed.
function BarList({ rows, label, value, format = currency, emptyTitle }) {
  if (!rows.length) return <EmptyState title={emptyTitle} detail="Try a wider date range." />;
  const max = Math.max(...rows.map(value), 1);
  return <ul className="bar-list">{rows.map((row) => {
    const text = `${label(row)}: ${format(value(row))}`;
    return <li key={label(row)} title={text}>
      <span className="bar-list__label">{label(row)}</span>
      <span className="bar-list__track" aria-hidden="true"><span className="bar-list__bar" style={{ width: `${Math.max(2, (value(row) / max) * 100)}%` }} /></span>
      <span className="bar-list__value">{format(value(row))}</span>
    </li>;
  })}</ul>;
}

// Sequential single-hue heatmap; every cell carries its count in a tooltip and the peak hours are also listed as text.
// Monday-first rows; the API returns weekday 0 = Sunday (PostgreSQL DOW, gym local time).
const HEAT_DAYS = [[1, "Mon", "Monday"], [2, "Tue", "Tuesday"], [3, "Wed", "Wednesday"], [4, "Thu", "Thursday"], [5, "Fri", "Friday"], [6, "Sat", "Saturday"], [0, "Sun", "Sunday"]];
const hourLabel = (hour) => `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
const partOfDay = (hour) => (hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening");

function AttendanceHeatmap({ cells, range }) {
  const [hover, setHover] = useState(null);
  if (!cells.length) return <EmptyState title="No check-ins in this range" detail="Pick a wider date range to see when members train." />;
  const counts = new Map(cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.count]));
  const max = Math.max(...cells.map((cell) => cell.count));
  const dataHours = cells.map((cell) => cell.hour);
  const hours = Array.from({ length: Math.max(23, ...dataHours) - Math.min(5, ...dataHours) + 1 }, (_, index) => Math.min(5, ...dataHours) + index);
  const total = cells.reduce((sum, cell) => sum + cell.count, 0);
  const weeks = Math.max(1, Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / (7 * 86_400_000)));
  const byDay = HEAT_DAYS.map(([weekday, , name]) => [name, cells.filter((cell) => cell.weekday === weekday).reduce((sum, cell) => sum + cell.count, 0)]).sort((left, right) => right[1] - left[1]);
  const peak = [...cells].sort((left, right) => right.count - left.count)[0];
  const parts = ["Morning", "Afternoon", "Evening"].map((name) => [name, cells.filter((cell) => partOfDay(cell.hour) === name).reduce((sum, cell) => sum + cell.count, 0)]).sort((left, right) => right[1] - left[1]);
  const level = (count) => (count ? Math.min(5, Math.ceil((count / max) * 5)) : 0);
  return <div className="peak">
    <dl className="peak-summary">
      <div><dt>Total check-ins</dt><dd>{total}</dd></div>
      <div><dt>Busiest day</dt><dd>{byDay[0][0]}</dd></div>
      <div><dt>Busiest slot</dt><dd>{HEAT_DAYS.find(([weekday]) => weekday === peak.weekday)[1]} {hourLabel(peak.hour)}–{hourLabel(peak.hour + 1)}</dd></div>
      <div><dt>Busiest part of day</dt><dd>{parts[0][0]} · {Math.round((parts[0][1] / total) * 100)}%</dd></div>
    </dl>
    <div className="peak-scroll">
      <div className="peak-grid" style={{ gridTemplateColumns: `44px repeat(${hours.length}, minmax(26px, 1fr))` }} role="grid" aria-label="Check-ins by weekday and hour, gym local time" onMouseLeave={() => setHover(null)}>
        <span />
        {hours.map((hour) => <span key={hour} className="peak-hour">{hour % 2 === 0 ? hourLabel(hour) : ""}</span>)}
        {HEAT_DAYS.map(([weekday, shortName, name]) => <div key={weekday} className="peak-row" role="row">
          <span className="peak-day">{shortName}</span>
          {hours.map((hour) => {
            const count = counts.get(`${weekday}-${hour}`) ?? 0;
            const label = `${name} ${hourLabel(hour)}–${hourLabel(hour + 1)}: ${count} check-in${count === 1 ? "" : "s"}`;
            return <span key={hour} role="gridcell" tabIndex={count ? 0 : -1} aria-label={label} className={`peak-cell peak-cell--${level(count)}`}
              onMouseEnter={() => setHover({ name, hour, count })} onFocus={() => setHover({ name, hour, count })} />;
          })}
        </div>)}
      </div>
    </div>
    <div className="peak-foot">
      <p className="peak-detail" role="status">{hover ? <><b>{hover.name} · {hourLabel(hover.hour)}–{hourLabel(hover.hour + 1)}</b> {hover.count} check-ins · about {(hover.count / weeks).toFixed(1)} per week</> : "Hover or tab to a cell for exact counts."}</p>
      <div className="peak-legend" aria-hidden="true"><span>Quiet</span>{[1, 2, 3, 4, 5].map((step) => <i key={step} className={`peak-cell peak-cell--${step}`} />)}<span>Busy</span></div>
    </div>
  </div>;
}

export default function OwnerAnalytics() {
  const [range, setRange] = useState({ from: isoDaysAgo(89), to: isoDaysAgo(0) });
  const [applied, setApplied] = useState(range);
  const [expiryWindow, setExpiryWindow] = useState("in7");
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      setState({ loading: false, error: "", data: responseData(await apiCalls.dashboard.ownerAnalytics(applied)) });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getApiError(error, "Unable to load analytics.") }));
    }
  }, [applied]);
  useEffect(() => { load(); }, [load]);
  const data = state.data;
  const expiring = data?.expiring?.[expiryWindow] ?? [];
  return <section className="owner-analytics" aria-label="Business analytics">
    <form className="analytics-filters" onSubmit={(event) => { event.preventDefault(); setApplied(range); }}>
      <Field label="From"><input type="date" required value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} /></Field>
      <Field label="To"><input type="date" required value={range.to} min={range.from} onChange={(event) => setRange({ ...range, to: event.target.value })} /></Field>
      <Button type="submit" variant="outline" disabled={state.loading}>{state.loading ? "Loading…" : "Apply range"}</Button>
    </form>
    <Notice error={state.error} />
    {state.loading && !data ? <LoadingState label="Crunching the numbers…" /> : data && <>
      <div className="dashboard-grid">
        <Card title="Revenue by month" eyebrow="Excludes voided payments"><BarList rows={data.revenueByMonth} label={(row) => monthLabel(row.month)} value={(row) => row.total} emptyTitle="No revenue in this range" /></Card>
        <Card title="Revenue by course" eyebrow="Collections"><BarList rows={data.revenueByCourse} label={(row) => row.name} value={(row) => row.total} emptyTitle="No course revenue in this range" /></Card>
        <Card title="Revenue by payment mode" eyebrow="UPI · cash · card"><BarList rows={data.revenueByMethod} label={(row) => METHOD_LABELS[row.method] ?? row.method} value={(row) => row.total} emptyTitle="No payments in this range" /></Card>
      </div>
      <Card title="Peak hours" eyebrow={`Check-ins by day and hour · ${data.range.from} to ${data.range.to} · gym local time`}><AttendanceHeatmap cells={data.attendanceHeatmap} range={data.range} /></Card>
      <div className="dashboard-grid">
        <Card title="Members at risk" eyebrow="Active, no check-in for 7+ days">
          {data.atRiskMembers.length ? <div className="table-wrap"><table><thead><tr><th>Member</th><th>Phone</th><th>Last seen</th></tr></thead><tbody>{data.atRiskMembers.map((member) => <tr key={member.clientId}>
            <td>{member.name}</td><td>{member.phone || "—"}</td>
            <td>{member.lastSeen ? <StatusPill tone="warning">! {dateLabel(member.lastSeen)}</StatusPill> : <StatusPill tone="danger">✕ Never checked in</StatusPill>}</td>
          </tr>)}</tbody></table></div> : <EmptyState title="Nobody at risk" detail="Every active member has checked in within the last 7 days." />}
        </Card>
        <Card title="Expiring memberships" eyebrow="Renewals" action={<div className="segmented" role="group" aria-label="Expiry window">
          <Button variant={expiryWindow === "in7" ? "outline" : "ghost"} aria-pressed={expiryWindow === "in7"} onClick={() => setExpiryWindow("in7")}>7 days ({data.expiring.in7.length})</Button>
          <Button variant={expiryWindow === "in15" ? "outline" : "ghost"} aria-pressed={expiryWindow === "in15"} onClick={() => setExpiryWindow("in15")}>15 days ({data.expiring.in15.length})</Button>
        </div>}>
          {expiring.length ? <div className="table-wrap"><table><thead><tr><th>Member</th><th>Course</th><th>Ends</th><th>Phone</th></tr></thead><tbody>{expiring.map((row) => <tr key={row.membershipId}>
            <td>{row.name}</td><td>{row.course}</td><td>{dateLabel(row.endDate)}</td><td>{row.phone || "—"}</td>
          </tr>)}</tbody></table></div> : <EmptyState title={`Nothing expiring in ${expiryWindow === "in7" ? 7 : 15} days`} />}
        </Card>
      </div>
      <Card title="Trainer workload" eyebrow="Active clients · check-ins in the last 30 days">
        {data.trainerWorkload.length ? <div className="table-wrap"><table><thead><tr><th>Trainer</th><th>Active clients</th><th>Check-ins (30d)</th><th>Courses</th></tr></thead><tbody>{data.trainerWorkload.map((trainer) => <tr key={trainer.trainerId}>
          <td>{trainer.name}</td><td>{trainer.activeClients}</td><td>{trainer.checkInsLast30d}</td><td>{trainer.courses.map((course) => course.name).join(", ") || "—"}</td>
        </tr>)}</tbody></table></div> : <EmptyState title="No active trainers" />}
      </Card>
    </>}
  </section>;
}
