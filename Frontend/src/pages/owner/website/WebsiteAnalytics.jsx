import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatCard } from "../../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../../services/api.js";
import { monthAgo, today } from "../../../utils/dates.js";
import { labelize } from "../../../utils/format.js";

export default function WebsiteAnalytics() {
  const [range, setRange] = useState({ from: monthAgo(), to: today() });
  const [result, setResult] = useState({ loading: true, error: "", data: null });
  useEffect(() => {
    let active = true;
    setResult((current) => ({ ...current, loading: true, error: "" }));
    apiCalls.analytics.summary(range).then((response) => {
      if (active) setResult({ loading: false, error: "", data: responseData(response) });
    }).catch((error) => { if (active) setResult({ loading: false, error: getApiError(error), data: null }); });
    return () => { active = false; };
  }, [range]);
  const metrics = useMemo(() => [
    ["totalVisits", "Visits"],
    ["uniqueVisitors", "Unique visitors"],
    ["websiteLeads", "Website leads"],
    ["confirmedTrials", "Confirmed trials"],
    ["attendedTrials", "Attended trials"],
    ["websiteEnrollments", "Enrollments"],
    ["visitToLeadRate", "Visit-to-lead rate"],
    ["trialAttendanceRate", "Trial attendance rate"],
    ["leadToEnrollmentRate", "Lead-to-enrollment rate"],
  ], []);
  const listSection = (title, items, renderItem) => <Card title={title}>{items.length ? <ul className="website-analytics-list">{items.map(renderItem)}</ul> : <EmptyState title={`No ${title.toLowerCase()} data`} detail="There is no recorded data for this date range." />}</Card>;
  return <>
    <PageHeader eyebrow="PUBLIC WEBSITE" title="Website analytics" description="Website performance reported by the analytics API. No estimates or sample metrics are shown." actions={<div className="website-date-range"><Field label="From"><input type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} /></Field><Field label="To"><input type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} /></Field></div>} />
    <Notice error={result.error} />
    {result.loading && !result.data ? <LoadingState label="Loading analytics…" /> : result.data ? <>
      <div className="stat-grid stat-grid--4">{metrics.map(([key, label]) => {
        const value = result.data[key];
        const display = value == null ? "—" : key.toLowerCase().includes("rate") ? `${value}%` : value;
        return <StatCard key={key} label={label} value={display} detail="Selected date range" />;
      })}</div>
      {listSection("Conversion funnel", Object.entries(result.data.conversionFunnel ?? {}), ([stage, count]) => <li key={stage}><span>{labelize(stage)}</span><b>{count}</b></li>)}
      {listSection("Leads by source", result.data.leadsBySource ?? [], (item) => <li key={item.source}><span>{labelize(item.source)}</span><b>{item.count}</b></li>)}
      {listSection("Leads by program", result.data.leadsByProgram ?? [], (item) => <li key={item.courseId ?? item.program}><span>{item.program}</span><b>{item.count}</b></li>)}
      {listSection("Lead status distribution", Object.entries(result.data.leadStatusDistribution ?? {}), ([status, count]) => <li key={status}><span>{labelize(status)}</span><b>{count}</b></li>)}
      {listSection("Visits and leads over time", result.data.visitsAndLeadsOverTime ?? [], (item) => <li key={item.date}><span>{item.date}</span><b>{item.visits} visits · {item.leads} leads</b></li>)}
    </> : null}
  </>;
}
