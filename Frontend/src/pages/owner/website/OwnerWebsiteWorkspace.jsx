import WebsiteAnalytics from "./WebsiteAnalytics.jsx";
import WebsiteLeads from "./WebsiteLeads.jsx";

export default function OwnerWebsiteWorkspace({ section }) {
  if (section === "Website Leads") return <WebsiteLeads />;
  if (section === "Website Analytics") return <WebsiteAnalytics />;
  return null;
}
