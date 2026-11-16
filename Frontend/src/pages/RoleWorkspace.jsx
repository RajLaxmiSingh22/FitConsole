import { lazy, Suspense, useState } from "react";
import { LoadingState } from "../components/ui/index.js";

// Each role's workspace is its own bundle, loaded only after sign-in.
const ClientWorkspace = lazy(() => import("./client/ClientWorkspace.jsx"));
const OwnerWorkspace = lazy(() => import("./owner/OwnerWorkspace.jsx"));
const OwnerWebsiteWorkspace = lazy(() => import("./owner/website/OwnerWebsiteWorkspace.jsx"));
const TrainerWorkspace = lazy(() => import("./trainer/TrainerWorkspace.jsx"));

export default function RoleWorkspace(props) {
  return <Suspense fallback={<LoadingState label="Loading your workspace…" />}><Workspace {...props} /></Suspense>;
}

function Workspace({ user, section, onNavigate }) {
  const [selectedClient, setSelectedClient] = useState(null);
  if (user.role === "owner") {
    return section === "Website" || section === "Website Leads" || section === "Website Analytics"
      ? <OwnerWebsiteWorkspace section={section} />
      : <OwnerWorkspace section={section} />;
  }
  if (user.role === "trainer") {
    return <TrainerWorkspace
      section={section}
      user={user}
      selectedClient={selectedClient}
      onSelectClient={(client) => { setSelectedClient(client); onNavigate("Progress"); }}
      onNavigate={onNavigate}
    />;
  }
  return <ClientWorkspace section={section} user={user} />;
}
