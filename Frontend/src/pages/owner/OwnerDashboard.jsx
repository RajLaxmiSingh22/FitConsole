import DownloadButton from "../../components/DownloadButton.jsx";
import { Button, Card, EmptyState, LoadingState, Notice, PageHeader, StatCard, StatusPill } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../services/api.js";
import { currency, dateLabel } from "../../utils/format.js";
import OwnerAnalytics from "./OwnerAnalytics.jsx";

export default function OwnerDashboard() {
  const dashboard = useLoad(async () => responseData(await apiCalls.dashboard.owner()));
  const data = dashboard.data ?? {};
  if (dashboard.loading && !dashboard.data) return <LoadingState />;
  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        title="Command center"
        description="A live view of memberships, collections, and renewals across your gym."
        actions={<DownloadButton label="Export payments.xlsx" download={apiCalls.exports.payments} />}
      />
      <Notice error={dashboard.error} />
      <div className="stat-grid stat-grid--5">
        <StatCard label="Revenue this month" value={currency(data.revenueThisMonth)} detail="Payments recorded this month" />
        <StatCard label="Active members" value={data.activeMembers ?? "—"} detail="Distinct clients with active memberships" tone="success" />
        <StatCard label="Expiring soon" value={data.expiringSoon?.length ?? "—"} detail="Renewals in the next 15 days" tone="warning" />
        <StatCard label="Awaiting payment" value={data.awaitingPayment ?? "—"} detail="Distinct clients with unpaid memberships" tone="warning" />
        <StatCard label="Pending dues" value={currency(data.outstandingDues)} detail="Active and awaiting-payment plans" tone="danger" />
      </div>
      <div className="dashboard-grid">
        <Card title="Renewals & dues" eyebrow="Needs attention" action={<Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Clients" }))}>View clients ↗</Button>}>
          {data.expiringSoon?.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Member</th><th>Membership ends</th><th>Status</th></tr></thead>
                <tbody>{data.expiringSoon.map((membership) => (
                  <tr key={membership.id}>
                    <td>{membership.Member?.User?.fullName ?? "Member"}</td>
                    <td>{dateLabel(membership.endDate)}</td>
                    <td><StatusPill tone="warning">Renewal due</StatusPill></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState title="No renewals due soon" detail="Memberships ending in the next 15 days will appear here." />}
        </Card>
        <Card title="Quick actions" eyebrow="Front desk">
          <div className="quick-actions">
            <button onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Clients" }))}><span className="quick-icon">＋</span><span><b>Add a client</b><small>Create a member profile</small></span></button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Payments" }))}><span className="quick-icon">₹</span><span><b>Record payment</b><small>Log cash, UPI, or card</small></span></button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Attendance" }))}><span className="quick-icon">✓</span><span><b>Check in a member</b><small>Record today's attendance</small></span></button>
          </div>
        </Card>
      </div>
      <OwnerAnalytics />
    </>
  );
}
