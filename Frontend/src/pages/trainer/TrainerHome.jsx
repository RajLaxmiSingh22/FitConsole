import { useEffect, useState } from "react";
import { Card, LoadingState, Notice, PageHeader, StatCard } from "../../components/ui/index.js";
import MemberAnalyticsTable from "../../components/analytics/MemberAnalyticsTable.jsx";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

export default function TrainerHome({ onSelectClient }) {
  const [data, setData] = useState({ clients: [], stats: null, loading: true, error: "" });
  const members = useLoad(async () => responseData(await apiCalls.analytics.members()));
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
  if (data.loading) return <LoadingState label="Loading your roster…" />;
  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} title="Good evening, coach" description="Your assigned roster and member progress, all in one place." />
    <Notice error={data.error} />
    <div className="stat-grid stat-grid--3">
      <StatCard label="My clients" value={data.stats?.clients ?? data.clients.length} detail="Assigned to your coaching roster" />
      <StatCard label="Active memberships" value={data.stats?.activeMembers ?? "—"} detail="Members currently training" tone="success" />
      <StatCard label="Check-ins this week" value={data.stats?.attendanceThisWeek ?? "—"} detail="Attendance records this week" tone="warning" />
    </div>
    <Card title="Member attendance & performance" eyebrow="Your assigned members">
      {members.loading && !members.data ? <LoadingState label="Loading member analytics…" /> : <MemberAnalyticsTable rows={members.data ?? []} onOpen={(row) => onSelectClient(data.clients.find((client) => client.id === row.id) ?? { id: row.id, userId: row.userId, User: { fullName: row.name } })} />}
      <Notice error={members.error} />
    </Card>
  </>;
}
