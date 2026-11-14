import { useEffect, useState } from "react";
import ClientAnalytics from "../../components/analytics/ClientAnalytics.jsx";
import { EmptyState } from "../../components/ui/index.js";
import { apiCalls, responseData } from "../../services/api.js";
import MessageWorkspace from "../messages/MessageWorkspace.jsx";
import TrainerClientDetail from "./TrainerClientDetail.jsx";
import TrainerHome from "./TrainerHome.jsx";
import TrainerPlanReview from "./TrainerPlanReview.jsx";
import TrainerProfile from "./TrainerProfile.jsx";

// A member opened from the roster: full analytics, plus the existing coaching tools (check-in, diet plans).
function TrainerClientView({ client, user, onBack, onMessage }) {
  const [tab, setTab] = useState("analytics");
  return <>
    <div className="desk-tabs" role="tablist" aria-label="Member sections">
      {[["analytics", "Analytics"], ["coaching", "Coaching tools"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>)}
    </div>
    {tab === "analytics"
      ? <ClientAnalytics clientId={client.id} viewerRole="trainer" onBack={onBack} />
      : <TrainerClientDetail client={client} user={user} onBack={onBack} onMessage={onMessage} />}
  </>;
}

export default function TrainerWorkspace({ section, user, selectedClient, onSelectClient, onNavigate }) {
  const [clients, setClients] = useState([]);
  useEffect(() => {
    apiCalls.trainers.clients().then((response) => setClients(responseData(response) ?? [])).catch(() => setClients([]));
  }, []);
  if (section === "Dashboard") return <TrainerHome onSelectClient={onSelectClient} />;
  if (section === "Progress" && selectedClient) return <TrainerClientView client={selectedClient} user={user} onBack={() => onNavigate("My clients")} onMessage={() => onNavigate("Messages")} />;
  if (section === "Progress" || section === "My clients") return <TrainerHome onSelectClient={onSelectClient} />;
  if (section === "Diet plans") return <TrainerPlanReview clients={clients} />;
  if (section === "Profile") return <TrainerProfile user={user} />;
  if (section === "Messages") return <MessageWorkspace currentUserId={user.id} contacts={clients.map((client) => ({ id: client.userId, name: client.User?.fullName ?? "Client", role: "client" }))} />;
  return <EmptyState title="No selected client" detail="Choose a client from your roster to review progress." />;
}
