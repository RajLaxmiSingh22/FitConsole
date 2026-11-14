import { useState } from "react";
import ClientAnalytics from "../../components/analytics/ClientAnalytics.jsx";
import { BarChart } from "../../components/analytics/charts.jsx";
import MemberAnalyticsTable from "../../components/analytics/MemberAnalyticsTable.jsx";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatCard } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../services/api.js";
import { isoDaysAgo } from "../../utils/dates.js";

const short = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const monthName = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });

function Bars({ rows, labelKey = "label", ariaLabel }) {
  if (!rows.length || rows.every((row) => !row.count)) return <EmptyState title="No check-ins in this range" />;
  return <BarChart data={rows.map((row) => ({ key: row[labelKey], label: row.title ?? row[labelKey], short: row.short ?? row[labelKey], count: row.count }))} value="count" label="Check-ins" ariaLabel={ariaLabel} />;
}

// Owner: gym-wide attendance and the member table; any member opens the shared analytics page.
export default function MemberAnalytics({ initialClientId = null, onClose }) {
  const [range, setRange] = useState({ from: isoDaysAgo(29), to: isoDaysAgo(0) });
  const [applied, setApplied] = useState(range);
  const [selected, setSelected] = useState(initialClientId);
  const overview = useLoad(async () => responseData(await apiCalls.analytics.gym(applied)), [applied]);
  const members = useLoad(async () => responseData(await apiCalls.analytics.members()));

  if (selected) return <ClientAnalytics clientId={selected} viewerRole="owner" onBack={() => { setSelected(null); onClose?.(); }} />;
  const data = overview.data;
  const totals = data?.totals ?? {};
  return <>
    <PageHeader eyebrow="Attendance & performance" title="Member analytics" description="Gym-wide attendance and every member's consistency. Select a member for their full history." />
    <form className="analytics-filters" onSubmit={(event) => { event.preventDefault(); setApplied(range); }}>
      <Field label="From"><input type="date" required value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} /></Field>
      <Field label="To"><input type="date" required value={range.to} min={range.from} onChange={(event) => setRange({ ...range, to: event.target.value })} /></Field>
      <Button type="submit" variant="outline" disabled={overview.loading}>{overview.loading ? "Loading…" : "Apply range"}</Button>
    </form>
    <Notice error={overview.error || members.error} />
    {overview.loading && !data ? <LoadingState label="Loading gym analytics…" /> : data && <>
      <div className="stat-grid stat-grid--4">
        <StatCard label="Active members" value={totals.activeMembers} detail={`${totals.todaysAttendance} checked in today`} tone="success" />
        <StatCard label="Avg attendance" value={totals.averageAttendanceRate == null ? "—" : `${totals.averageAttendanceRate}%`} detail={`${totals.averageVisitsPerMember} visits per member (30 days)`} />
        <StatCard label="Active streaks" value={totals.activeStreaks} detail={`${totals.declining} with declining attendance`} tone="warning" />
        <StatCard label="Absent 7+ days" value={totals.absent7} detail={`${totals.absent14} absent 14+ days · ${totals.expiringSoon} renewals due`} tone="danger" />
      </div>
      <div className="dashboard-grid">
        <Card title="Daily attendance" eyebrow={`${short(data.range.from)} – ${short(data.range.to)}`}><Bars rows={data.daily.map((row) => ({ label: row.date, title: short(row.date), short: short(row.date), count: row.count }))} ariaLabel="Check-ins per day" /></Card>
        <Card title="Weekly trend" eyebrow="Check-ins per week"><Bars rows={data.weekly.map((row) => ({ label: row.week, title: `Week of ${short(row.week)}`, short: short(row.week), count: row.count }))} ariaLabel="Check-ins per week" /></Card>
        <Card title="Monthly trend" eyebrow="Check-ins per month"><Bars rows={data.monthly.map((row) => ({ label: row.month, title: monthName(row.month), short: monthName(row.month), count: row.count }))} ariaLabel="Check-ins per month" /></Card>
        <Card title="Consistency distribution" eyebrow="Active members by attendance rate"><Bars rows={data.consistency.map((row) => ({ label: row.label, count: row.count }))} ariaLabel="Members by attendance rate" /></Card>
        <Card title="Attendance by coach" eyebrow="Check-ins in range"><Bars rows={data.byTrainer.map((row) => ({ label: row.label, short: row.label.split(" ")[0], count: row.count }))} ariaLabel="Check-ins by coach" /></Card>
        <Card title="Attendance by program" eyebrow="Check-ins in range"><Bars rows={data.byCourse.map((row) => ({ label: row.label, short: row.label.split(" ")[0], count: row.count }))} ariaLabel="Check-ins by program" /></Card>
      </div>
    </>}
    <Card title="Members" eyebrow="Attendance & performance">
      {members.loading && !members.data ? <LoadingState label="Loading members…" /> : <MemberAnalyticsTable rows={members.data ?? []} showTrainer onOpen={(row) => setSelected(row.id)} />}
    </Card>
  </>;
}
