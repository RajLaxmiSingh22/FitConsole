import { EmptyState, LoadingState, Notice, PageHeader } from "../../components/ui/index.js";
import { useClientWorkspaceData } from "../../hooks/useClientWorkspaceData.js";
import MessageWorkspace from "../messages/MessageWorkspace.jsx";
import ClientProfile from "./ClientProfile.jsx";
import DailyCheckIn from "./DailyCheckIn.jsx";
import Home from "./Home.jsx";
import MealPlan from "./MealPlan.jsx";
import Membership from "./Membership.jsx";
import WeeklyProgress from "./WeeklyProgress.jsx";

export default function ClientWorkspace({ section, user }) {
  const { data, reload: load } = useClientWorkspaceData(user.id);
  const clientId = data.client?.id;
  if (data.loading) return <LoadingState label="Loading your FitConsole…" />;
  if (!data.client) return <><PageHeader title="Client profile unavailable" description="We couldn’t load your member profile." /><Notice error={data.error} /></>;
  const approvedPlans = data.plans.filter((plan) => plan.status === "approved");
  const contacts = data.trainer?.User ? [{ id: data.trainer.User.id, name: data.trainer.User.fullName, role: "trainer" }] : [];
  return <>
    <Notice error={data.error} />
    {section === "Home" && <Home user={user} plans={approvedPlans} entries={data.entries} memberships={data.memberships} attendance={data.attendance} summary={data.summary} onNavigate={(next) => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: next }))} />}
    {section === "Meal plan" && <MealPlan plans={approvedPlans} />}
    {section === "Check-in" && <><DailyCheckIn entries={data.entries} clientId={clientId} onSaved={load} /><WeeklyProgress clientId={clientId} /></>}
    {section === "Membership" && <Membership courses={data.courses} memberships={data.memberships} payments={data.payments} waiver={data.waiver} waivers={data.waivers} onWaiverAccepted={load} onRefresh={load} />}
    {section === "Messages" && <MessageWorkspace currentUserId={user.id} contacts={contacts} />}
    {section === "Profile" && <ClientProfile user={user} client={data.client} onSaved={load} />}
    {!["Home", "Meal plan", "Check-in", "Membership", "Messages", "Profile"].includes(section) && <EmptyState title="Choose a section" />}
  </>;
}
