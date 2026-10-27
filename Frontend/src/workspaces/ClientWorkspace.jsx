import { useEffect, useState } from "react";
import { apiCalls, getApiError } from "../api.js";
import { openCashfreeCheckout } from "../cashfree.js";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LoadingState,
  Notice,
  PageHeader,
  StatCard,
  StatusPill,
  currency,
  dateLabel,
  responseData,
} from "../components/ui.jsx";
import MessageWorkspace from "./MessageWorkspace.jsx";

const today = () => new Date().toISOString().slice(0, 10);

function Home({ user, plans, entries, memberships, attendance, summary, onNavigate }) {
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

function MealPlan({ plans }) {
  const plan = plans[0];
  return <>
    <PageHeader eyebrow="Fuel for the work" title="Your meal plan" description="A trainer-reviewed plan to support your training. Talk to your coach before making major changes." />
    {plan ? <div className="meal-plan-card panel">
      <div className="meal-plan-heading"><div><p className="overline">APPROVED · {dateLabel(plan.reviewedAt ?? plan.updatedAt)}</p><h2>{plan.plan?.title ?? "Your personalized plan"}</h2></div><StatusPill tone="success">Coach approved</StatusPill></div>
      {typeof plan.plan === "string" ? <p className="plan-copy">{plan.plan}</p> : <div className="meal-plan-content">{Object.entries(plan.plan ?? {}).map(([key, value]) => <section key={key}><h3>{key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</h3>{Array.isArray(value) ? <ul>{value.map((item, index) => <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>)}</ul> : <p>{typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value)}</p>}</section>)}</div>}
      <p className="plan-disclaimer">General wellness guidance only. For medical or dietary conditions, consult a qualified healthcare professional.</p>
    </div> : <EmptyState title="No approved plan yet" detail="Your trainer will share a meal plan here after reviewing it." />}
  </>;
}

function DailyCheckIn({ entries, clientId, onSaved }) {
  const [form, setForm] = useState({ weightKg: "", sleepDurationHours: "", calories: "", waterLiters: "", hunger: "", mood: "", triggers: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const todaysEntries = entries.filter((entry) => entry.recordedOn === today());
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { recordedOn: today() };
    if (form.weightKg !== "") payload.weightKg = Number(form.weightKg);
    if (form.sleepDurationHours !== "") payload.sleepDurationHours = Number(form.sleepDurationHours);
    if (form.calories !== "") payload.calories = Number(form.calories);
    if (form.waterLiters !== "") payload.waterLiters = Number(form.waterLiters);
    if (form.hunger) payload.hunger = form.hunger;
    if (form.mood) payload.mood = form.mood;
    if (form.triggers) payload.triggers = form.triggers;
    try {
      await apiCalls.clients.createDietEntry(clientId, payload);
      setForm({ weightKg: "", sleepDurationHours: "", calories: "", waterLiters: "", hunger: "", mood: "", triggers: "" });
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save your check-in."));
    } finally {
      setSaving(false);
    }
  }
  return <>
    <PageHeader eyebrow="Daily tracker" title="Check in with yourself" description="A few details help you and your coach notice the patterns that matter." />
    {todaysEntries.length > 0 && <Notice tone="warning" error="You’ve already logged today. You can add another entry if you need to update your record." />}
    <Notice error={error} />
    <Card title="Today’s check-in" eyebrow={dateLabel(today())}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Weight (kg)"><input type="number" min="0.1" max="500" step="0.1" placeholder="e.g. 72.5" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} /></Field>
        <Field label="Sleep (hours)"><input type="number" min="0" max="24" step="0.5" placeholder="e.g. 7.5" value={form.sleepDurationHours} onChange={(event) => setForm({ ...form, sleepDurationHours: event.target.value })} /></Field>
        <Field label="Calories"><input type="number" min="0" step="1" placeholder="Optional" value={form.calories} onChange={(event) => setForm({ ...form, calories: event.target.value })} /></Field>
        <Field label="Water (litres)"><input type="number" min="0" max="50" step="0.1" placeholder="e.g. 2.5" value={form.waterLiters} onChange={(event) => setForm({ ...form, waterLiters: event.target.value })} /></Field>
        <Field label="Hunger"><select value={form.hunger} onChange={(event) => setForm({ ...form, hunger: event.target.value })}><option value="">Select</option><option>Low</option><option>Balanced</option><option>High</option></select></Field>
        <Field label="Mood"><select value={form.mood} onChange={(event) => setForm({ ...form, mood: event.target.value })}><option value="">Select</option><option>Great</option><option>Good</option><option>Okay</option><option>Low</option></select></Field>
        <Field className="field--wide" label="Notes or triggers"><textarea rows="3" maxLength="2000" placeholder="Anything you’d like your coach to know?" value={form.triggers} onChange={(event) => setForm({ ...form, triggers: event.target.value })} /></Field>
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save check-in"}</Button></div>
      </form>
    </Card>
    <Card title="Your recent check-ins" eyebrow="Progress history">
      {entries.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Sleep</th><th>Calories</th><th>Water</th><th>Mood</th></tr></thead><tbody>{entries.slice(0, 12).map((entry) => <tr key={entry.id}><td>{dateLabel(entry.recordedOn)}</td><td>{entry.weightKg ? `${entry.weightKg} kg` : "—"}</td><td>{entry.sleepDurationHours ? `${entry.sleepDurationHours} h` : "—"}</td><td>{entry.calories ?? "—"}</td><td>{entry.waterLiters ? `${entry.waterLiters} L` : "—"}</td><td>{entry.mood || "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="Your first check-in starts here" detail="Entries you save will show up in this progress log." />}
    </Card>
  </>;
}

function Membership({ courses, memberships, payments, waiver, waivers, onWaiverAccepted, onRefresh }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkoutMembershipId, setCheckoutMembershipId] = useState("");
  const [checkoutOfferId, setCheckoutOfferId] = useState("");
  const [acceptance, setAcceptance] = useState(false);
  const currentVersion = waiver?.version ?? "1";
  const alreadyAccepted = acceptance || waivers.some((item) => item.agreementVersion === String(currentVersion));
  async function accept() {
    setSaving(true);
    setError("");
    try {
      await apiCalls.waivers.accept(null);
      setAcceptance(true);
      onWaiverAccepted();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to record waiver acceptance."));
    } finally {
      setSaving(false);
    }
  }
  async function checkout(membershipId) {
    setCheckoutMembershipId(membershipId);
    setError("");
    try {
      const result = responseData(await apiCalls.payments.createCashfreeOrder({ membershipId }));
      await openCashfreeCheckout(result.paymentSessionId);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to start Cashfree checkout."));
    } finally {
      setCheckoutMembershipId("");
    }
  }
  async function checkoutOffer(course, plan) {
    const offerId = `${course.id}-${plan.durationMonths}`;
    setCheckoutOfferId(offerId);
    setError("");
    let membershipCreated = false;
    try {
      const membership = responseData(await apiCalls.memberships.createClientCheckout({
        courseId: course.id,
        durationMonths: Number(plan.durationMonths),
      }));
      membershipCreated = true;
      const order = responseData(await apiCalls.payments.createCashfreeOrder({ membershipId: membership.id }));
      await onRefresh();
      await openCashfreeCheckout(order.paymentSessionId);
    } catch (requestError) {
      if (membershipCreated) {
        await onRefresh();
        setError(`${getApiError(requestError, "Unable to start Cashfree checkout.")} Your membership is saved; use its payment button below to try again.`);
      } else {
        setError(getApiError(requestError, "Unable to start this course offer."));
      }
    } finally {
      setCheckoutOfferId("");
    }
  }
  const unpaidCourses = new Set(memberships.filter((membership) => {
    if (membership.status !== "active") return false;
    const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return paid < Number(membership.totalAmount);
  }).map((membership) => membership.courseId));
  return <>
    <PageHeader eyebrow="Account" title="Membership & payments" description="Your membership, payment history, and current gym agreement." />
    <Notice error={error} />
    <Card title="Courses & offers" eyebrow="Plans set by your gym">
      {courses.length ? <div className="course-grid">{courses.map((course) => (
        <article className="panel course-card" key={course.id}>
          <div className="course-top"><StatusPill tone="primary">{course.category}</StatusPill><span className="overline">AVAILABLE OFFER</span></div>
          <h2>{course.name}</h2>
          <p className="muted">{course.description || "Choose a membership duration to get started."}</p>
          {course.CoursePlans?.length ? <div className="client-offer-list">{course.CoursePlans.slice().sort((a, b) => Number(a.durationMonths) - Number(b.durationMonths)).map((plan) => {
            const offerId = `${course.id}-${plan.durationMonths}`;
            const busy = checkoutOfferId === offerId;
            const unpaid = unpaidCourses.has(course.id);
            return <div className="client-offer-row" key={plan.id}>
              <span><b>{plan.durationMonths} {Number(plan.durationMonths) === 1 ? "month" : "months"}</b><small>Membership offer</small></span>
              <strong>{currency(plan.price)}</strong>
              <Button type="button" variant="outline" disabled={Boolean(checkoutOfferId) || Boolean(checkoutMembershipId) || unpaid} onClick={() => checkoutOffer(course, plan)}>
                {busy ? "Starting…" : unpaid ? "Pay current balance below" : "Choose & pay"}
              </Button>
            </div>;
          })}</div> : <p className="muted">No membership offers are available for this course yet.</p>}
        </article>
      ))}</div> : <EmptyState title="No courses available" detail="The gym will publish course offers here when they are ready." />}
    </Card>
    <div className="dashboard-grid">
      <Card title="Memberships" eyebrow="Your plans">
        {memberships.length ? <div className="membership-list">{memberships.map((membership) => {
          const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          const due = Math.max(0, Number((Number(membership.totalAmount) - paid).toFixed(2)));
          return <article className="membership-row" key={membership.id}>
            <div><b>{membership.Course?.name ?? "Gym membership"}</b><small>{dateLabel(membership.startDate)} — {dateLabel(membership.endDate)}</small></div>
            <StatusPill tone={membership.status === "active" ? "success" : membership.status === "expired" ? "warning" : "neutral"}>{membership.status}</StatusPill>
            <strong>{currency(membership.totalAmount)}</strong>
            {membership.status === "active" && due > 0 && <Button type="button" variant="outline" disabled={Boolean(checkoutMembershipId)} onClick={() => checkout(membership.id)}>{checkoutMembershipId === membership.id ? "Opening…" : `Pay ${currency(due)}`}</Button>}
          </article>;
        })}</div> : <EmptyState title="No membership found" detail="The gym team can help you choose a course and membership plan." />}
      </Card>
      <Card title="Gym agreement" eyebrow={`Current waiver · version ${currentVersion}`}>
        {waiver?.text && <div className="waiver-copy">{waiver.text}</div>}
        <div className="waiver-acceptance">{alreadyAccepted ? <StatusPill tone="success">Agreement accepted</StatusPill> : <><label className="checkbox-field"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I have read and agree to the current gym waiver.</span></label><Button onClick={accept} disabled={!accepted || saving}>{saving ? "Recording…" : "Accept agreement"}</Button></>}</div>
      </Card>
    </div>
    <Card title="Payment history" eyebrow="Recorded by the gym">
      {payments.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.dateTime)}</td><td>{payment.paymentMethod ?? "—"}</td><td>{currency(payment.amount)}</td><td><StatusPill tone="success">recorded</StatusPill></td></tr>)}</tbody></table></div> : <EmptyState title="No payments recorded yet" detail="Payments recorded by the gym will appear here." />}
    </Card>
  </>;
}

function ClientProfile({ user, client, onSaved }) {
  const [form, setForm] = useState({ phone: client.phone ?? "", emergencyContactPhone: client.emergencyContactPhone ?? "", goal: client.goal ?? "", address: client.address ?? "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiCalls.clients.updateMe(form);
      setMessage("Profile updated.");
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update your profile."));
    } finally {
      setSaving(false);
    }
  }
  return <>
    <PageHeader eyebrow="Personal details" title="Your profile" description="Keep your contact information and training goal up to date." />
    <Notice error={error} />    <Notice tone="success" error={message} />
    <Card title="Profile details"><form className="form-grid" onSubmit={save}>
      <Field label="Full name"><input value={user.fullName} disabled /></Field>
      <Field label="Email"><input value={user.email} disabled /></Field>
      <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label="Emergency contact"><input value={form.emergencyContactPhone} onChange={(event) => setForm({ ...form, emergencyContactPhone: event.target.value })} /></Field>
      <Field label="Training goal"><input value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /></Field>
      <Field label="Address"><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
      <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></div>
    </form></Card>
  </>;
}

export default function ClientWorkspace({ section, user }) {
  const [data, setData] = useState({ loading: true, error: "", client: null, courses: [], memberships: [], payments: [], plans: [], entries: [], attendance: [], summary: null, waiver: null, trainer: null });
  const clientId = data.client?.id;
  async function load() {
    try {
      const profile = responseData(await apiCalls.clients.me());
      const [membershipResult, paymentResult, planResult, entryResult, attendanceResult, summaryResult, waiverResult, clientWaiverResult, trainerResult, coursesResult] = await Promise.allSettled([
        apiCalls.clients.memberships(profile.id),
        apiCalls.clients.payments(profile.id),
        apiCalls.clients.dietPlans(profile.id),
        apiCalls.clients.dietEntries(profile.id),
        apiCalls.clients.attendance(profile.id),
        apiCalls.clients.dietSummary(profile.id),
        apiCalls.waivers.current(),
        apiCalls.clients.waivers(profile.id),
        profile.trainerId ? apiCalls.trainers.list() : Promise.resolve(null),
        apiCalls.courses.list(),
      ]);
      const trainerList = trainerResult.status === "fulfilled" && trainerResult.value
        ? responseData(trainerResult.value) ?? []
        : [];
      const trainer = trainerList.find((item) => item.id === profile.trainerId);
      let trainerProfile = null;
      let trainerError = "";
      if (trainer) {
        try {
          trainerProfile = responseData(await apiCalls.trainers.get(trainer.userId));
        } catch (error) {
          trainerError = getApiError(error, "Unable to load trainer contact.");
        }
      }
      const warnings = [membershipResult, paymentResult, planResult, entryResult, attendanceResult, summaryResult, waiverResult, clientWaiverResult, trainerResult, coursesResult]
        .filter((result) => result.status === "rejected")
        .map((result) => getApiError(result.reason));
      if (trainerError) warnings.push(trainerError);
      setData({
        loading: false,
        error: warnings.join(" · "),
        client: profile,
        courses: coursesResult.status === "fulfilled" ? responseData(coursesResult.value) ?? [] : [],
        memberships: membershipResult.status === "fulfilled" ? responseData(membershipResult.value) ?? [] : [],
        payments: paymentResult.status === "fulfilled" ? responseData(paymentResult.value) ?? [] : [],
        plans: planResult.status === "fulfilled" ? responseData(planResult.value) ?? [] : [],
        entries: entryResult.status === "fulfilled" ? responseData(entryResult.value) ?? [] : [],
        attendance: attendanceResult.status === "fulfilled" ? responseData(attendanceResult.value) ?? [] : [],
        summary: summaryResult.status === "fulfilled" ? responseData(summaryResult.value) : null,
        waiver: waiverResult.status === "fulfilled" ? responseData(waiverResult.value) : null,
        waivers: clientWaiverResult.status === "fulfilled" ? responseData(clientWaiverResult.value) ?? [] : [],
        trainer: trainerProfile,
      });
    } catch (error) {
      setData((current) => ({ ...current, loading: false, error: getApiError(error, "Unable to load your client profile.") }));
    }
  }
  useEffect(() => { load(); }, [user.id]);
  useEffect(() => {
    window.addEventListener("fitconsole:payment-confirmed", load);
    return () => window.removeEventListener("fitconsole:payment-confirmed", load);
  }, [user.id]);
  if (data.loading) return <LoadingState label="Loading your FitConsole…" />;
  if (!data.client) return <><PageHeader title="Client profile unavailable" description="We couldn’t load your member profile." /><Notice error={data.error} /></>;
  const approvedPlans = data.plans.filter((plan) => plan.status === "approved");
  const contacts = data.trainer?.User ? [{ id: data.trainer.User.id, name: data.trainer.User.fullName, role: "trainer" }] : [];
  return <>
    <Notice error={data.error} />
    {section === "Home" && <Home user={user} plans={approvedPlans} entries={data.entries} memberships={data.memberships} attendance={data.attendance} summary={data.summary} onNavigate={(next) => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: next }))} />}
    {section === "Meal plan" && <MealPlan plans={approvedPlans} />}
    {section === "Check-in" && <DailyCheckIn entries={data.entries} clientId={clientId} onSaved={load} />}
    {section === "Membership" && <Membership courses={data.courses} memberships={data.memberships} payments={data.payments} waiver={data.waiver} waivers={data.waivers} onWaiverAccepted={load} onRefresh={load} />}
    {section === "Messages" && <MessageWorkspace currentUserId={user.id} contacts={contacts} />}
    {section === "Profile" && <ClientProfile user={user} client={data.client} onSaved={load} />}
    {!["Home", "Meal plan", "Check-in", "Membership", "Messages", "Profile"].includes(section) && <EmptyState title="Choose a section" />}
  </>;
}
