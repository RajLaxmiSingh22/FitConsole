import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, StatusPill } from "../../components/ui/index.js";
import { METHOD_LABELS, WEEKDAYS } from "../../constants/reports.js";
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
function AttendanceHeatmap({ cells }) {
  if (!cells.length) return <EmptyState title="No check-ins in this range" detail="Attendance will appear here by weekday and hour." />;
  const counts = new Map(cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.count]));
  const max = Math.max(...cells.map((cell) => cell.count));
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const peaks = [...cells].sort((a, b) => b.count - a.count).slice(0, 5);
  const level = (count) => (count ? Math.min(4, Math.ceil((count / max) * 4)) : 0);
  return <>
    <div className="heatmap-scroll">
      <div className="heatmap" role="img" aria-label="Check-ins by weekday and hour, gym local time">
        <span />
        {hours.map((hour) => <span className="heatmap__hour" key={hour}>{hour % 3 === 0 ? hour : ""}</span>)}
        {WEEKDAYS.map((day, weekday) => <div className="heatmap__row" key={day}>
          <span className="heatmap__day">{day}</span>
          {hours.map((hour) => {
            const count = counts.get(`${weekday}-${hour}`) ?? 0;
            return <span key={hour} className={`heatmap__cell heatmap__cell--${level(count)}`} title={`${day} ${String(hour).padStart(2, "0")}:00 · ${count} check-ins`} />;
          })}
        </div>)}
      </div>
    </div>
    <div className="heatmap-legend" aria-hidden="true"><span>Fewer</span>{[0, 1, 2, 3, 4].map((step) => <span key={step} className={`heatmap__cell heatmap__cell--${step}`} />)}<span>More</span></div>
    <p className="muted">Busiest: {peaks.map((cell) => `${WEEKDAYS[cell.weekday]} ${String(cell.hour).padStart(2, "0")}:00 (${cell.count})`).join(" · ")}</p>
  </>;
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
        <Card title="Peak hours" eyebrow="Check-ins · gym local time"><AttendanceHeatmap cells={data.attendanceHeatmap} /></Card>
      </div>
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
