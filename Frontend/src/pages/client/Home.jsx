import { Button, Card, EmptyState, PageHeader, StatCard, StatusPill } from "../../components/ui/index.js";
import { today } from "../../utils/dates.js";
import { dateLabel } from "../../utils/format.js";

export default function Home({ user, plans, entries, memberships, attendance, summary, onNavigate }) {
  const activeMembership = memberships.find((membership) => membership.status === "active");
  const latestEntry = entries[0];
  const latestPlan = plans[0];
  const lastAttendance = attendance[0];
  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} title={`Welcome back, ${user.fullName.split(" ")[0]}`} description="One day stronger. Keep your training, nutrition, and recovery moving forward." />
    <div className="client-hero-card">
      <div><p className="overline">YOUR TRAINING STATUS</p><h2>{activeMembership ? "You’re in the fight." : "Your next round starts here."}</h2><p>{activeMembership ? `${activeMembership.Course?.name ?? "Active course"} · Membership ends ${dateLabel(activeMembership.endDate)}` : "Ask the front desk about an active membership and upcoming classes."}</p></div>
      <div className="client-hero-mark">FC<span> / TRAINING CLUB</span></div>
    </div>
    <div className="stat-grid stat-grid--4">
      <StatCard label="Membership" value={activeMembership ? "ACTIVE" : "—"} detail={activeMembership ? `Until ${dateLabel(activeMembership.endDate)}` : "No active membership"} tone={activeMembership ? "success" : ""} />
      <StatCard label="Latest weight" value={latestEntry?.weightKg ? `${latestEntry.weightKg} kg` : "—"} detail={latestEntry ? `Logged ${dateLabel(latestEntry.recordedOn)}` : "Add your first check-in"} />
      <StatCard label="Training visits" value={attendance.length} detail={lastAttendance ? `Last visit ${dateLabel(lastAttendance.attendedAt)}` : "Your attendance history"} tone="warning" />
      <StatCard label="Meal plan" value={latestPlan ? "READY" : "PENDING"} detail={latestPlan ? "Trainer-approved plan" : "Your coach can prepare one"} tone={latestPlan ? "success" : ""} />
    </div>
    {summary?.weightChangeOverTwoWeeksKg != null && <div className="trend-note"><span className="overline">WEIGHT · 2-WEEK TREND</span><b>{summary.weightChangeOverTwoWeeksKg > 0 ? "+" : ""}{summary.weightChangeOverTwoWeeksKg} kg</b><span>Based on your recorded check-ins</span></div>}
    <div className="dashboard-grid">
      <Card title="Today’s check-in" eyebrow={today()}>
        {latestEntry?.recordedOn === today() ? <div className="checkin-complete"><span>✓</span><div><b>You checked in today</b><p>{latestEntry.weightKg ? `Weight ${latestEntry.weightKg} kg` : "Keep up the consistency."} {latestEntry.mood ? `· Mood: ${latestEntry.mood}` : ""}</p></div><StatusPill tone="success">Logged</StatusPill></div> : <div className="dashboard-callout"><p>A quick daily log helps your coach tailor your plan and track your progress.</p><Button onClick={() => onNavigate("Check-in")}>Log today’s check-in ↗</Button></div>}
      </Card>
      <Card title="Coach’s note" eyebrow="Nutrition">
        {latestPlan ? <><h3>{latestPlan.plan?.title ?? "Your approved meal plan"}</h3><p className="muted">Your latest approved plan is ready. Follow it at your pace and check in with your coach when you need support.</p><Button variant="outline" onClick={() => onNavigate("Meal plan")}>View meal plan</Button></> : <EmptyState title="Your coach is preparing a plan" detail="An approved meal plan will appear here when it is ready." />}
      </Card>
    </div>
    <div className="client-shortcuts">
      <button onClick={() => onNavigate("Membership")}><span className="quick-icon">↗</span><span><b>Membership & payments</b><small>Plans, history, and waiver</small></span></button>
      <button onClick={() => onNavigate("Messages")}><span className="quick-icon">✉</span><span><b>Message your coach</b><small>Ask a question or share an update</small></span></button>
    </div>
  </>;
}
