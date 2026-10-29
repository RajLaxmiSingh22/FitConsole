import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatCard, StatusPill } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { initials } from "../../utils/format.js";

export default function TrainerHome({ onSelectClient }) {
  const [data, setData] = useState({ clients: [], stats: null, loading: true, error: "" });
  const [search, setSearch] = useState("");
  useEffect(() => {
    Promise.all([apiCalls.trainers.clients(), apiCalls.dashboard.trainer()])
      .then(([clientResponse, dashboardResponse]) => setData({
        clients: responseData(clientResponse) ?? [],
        stats: responseData(dashboardResponse),
        loading: false,
        error: "",
      }))
      .catch((error) => setData((current) => ({ ...current, loading: false, error: getApiError(error) })));
  }, []);
  const filtered = useMemo(() => data.clients.filter((client) => client.User?.fullName?.toLowerCase().includes(search.toLowerCase())), [data.clients, search]);
  if (data.loading) return <LoadingState label="Loading your roster…" />;
  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} title="Good evening, coach" description="Your assigned roster and member progress, all in one place." />
    <Notice error={data.error} />
    <div className="stat-grid stat-grid--3">
      <StatCard label="My clients" value={data.stats?.clients ?? data.clients.length} detail="Assigned to your coaching roster" />
      <StatCard label="Active memberships" value={data.stats?.activeMembers ?? "—"} detail="Members currently training" tone="success" />
      <StatCard label="Check-ins this week" value={data.stats?.attendanceThisWeek ?? "—"} detail="Attendance records this week" tone="warning" />
    </div>
    <Card title="My clients" eyebrow="Coaching roster" action={<Field label="Search"><input type="search" placeholder="Search clients" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>}>
      {filtered.length ? <div className="client-card-grid">{filtered.map((client) => <button className="client-preview" key={client.id} onClick={() => onSelectClient(client)}>
        <div className="person-cell"><span className="avatar">{initials(client.User?.fullName)}</span><span><b>{client.User?.fullName ?? "Client"}</b><small>{client.goal || "Goal not set"}</small></span><span className="arrow">↗</span></div>
        <div className="preview-meta"><span>{client.phone || client.User?.email || "No contact info"}</span><StatusPill tone="primary">View progress</StatusPill></div>
      </button>)}</div> : <EmptyState title="No assigned clients" detail="Clients assigned to your trainer profile will show up here." />}
    </Card>
  </>;
}
