import { useState } from "react";
import ClientWorkspace from "./client/ClientWorkspace.jsx";
import OwnerWorkspace from "./owner/OwnerWorkspace.jsx";
import OwnerWebsiteWorkspace from "./owner/website/OwnerWebsiteWorkspace.jsx";
import TrainerWorkspace from "./trainer/TrainerWorkspace.jsx";

export default function RoleWorkspace({ user, section, onNavigate }) {
  const [selectedClient, setSelectedClient] = useState(null);
  if (user.role === "owner") {
    return section === "Website Leads" || section === "Website Analytics"
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
