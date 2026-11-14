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
        <StatCard label="Total clients" value={data.totalClients ?? "—"} detail="Member profiles" />
        <StatCard label="Active memberships" value={data.activeMembers ?? "—"} detail="Members training now" tone="success" />
        <StatCard label="Expired memberships" value={data.expiredMemberships ?? "—"} detail="Members to win back" />
        <StatCard label="Trainers" value={data.totalTrainers ?? "—"} detail="Coaching team" />
        <StatCard label="Today's attendance" value={data.todaysAttendance ?? "—"} detail="Check-ins so far today" tone="success" />
      </div>
      <div className="stat-grid stat-grid--4">
        <StatCard label="Revenue this month" value={currency(data.revenueThisMonth)} detail="Payments recorded this month" />
        <StatCard label="Expiring soon" value={data.expiringSoon?.length ?? "—"} detail="Renewals in the next 15 days" tone="warning" />
        <StatCard label="Awaiting payment" value={data.awaitingPayment ?? "—"} detail="Distinct clients with unpaid memberships" tone="warning" />
        <StatCard label="Pending dues" value={currency(data.outstandingDues)} detail="Active and awaiting-payment plans" tone="danger" />
      </div>
      <div className="dashboard-grid">
        <Card title="Recent payments" eyebrow="Latest collections" action={<Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Payments" }))}>All payments ↗</Button>}>
          {data.recentPayments?.length ? <ul className="history-list">{data.recentPayments.map((payment) => <li key={payment.id}>
            <span><b>{payment.member}</b><small>{payment.course ?? "Payment"} · {dateLabel(payment.paidAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small></span>
            <StatusPill tone="neutral">{payment.method.toUpperCase()}</StatusPill>
            <span className="history-amount">{currency(payment.amount)}</span>
          </li>)}</ul> : <EmptyState title="No payments yet" />}
        </Card>
        <Card title="Recent check-ins" eyebrow="Front desk" action={<Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Attendance" }))}>Attendance ↗</Button>}>
          {data.recentAttendance?.length ? <ul className="history-list">{data.recentAttendance.map((visit) => <li key={visit.id}>
            <span><b>{visit.member}</b><small>{visit.course ?? "Visit"}</small></span>
            <StatusPill tone={visit.checkedOutAt ? "neutral" : "success"}>{visit.checkedOutAt ? "Checked out" : "In gym"}</StatusPill>
            <span className="history-amount">{dateLabel(visit.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
          </li>)}</ul> : <EmptyState title="No check-ins yet" />}
        </Card>
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
