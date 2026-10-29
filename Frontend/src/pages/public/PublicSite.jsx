import { useAnalyticsConsent } from "../../hooks/useAnalyticsConsent.js";
import { usePageViewAnalytics } from "../../hooks/usePageViewAnalytics.js";
import { usePublicCatalog } from "../../hooks/usePublicCatalog.js";
import PublicHome from "./PublicHome.jsx";
import PublicPage from "./PublicPage.jsx";
import AnalyticsConsentBanner from "./components/AnalyticsConsentBanner.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import SiteHeader from "./components/SiteHeader.jsx";

export default function PublicSite({ path }) {
  const catalog = usePublicCatalog();
  const analytics = useAnalyticsConsent();
  usePageViewAnalytics(path, analytics.consent);
  const page = path === "/" ? "home" : path.slice(1);
  return <div className="public-site">
    <SiteHeader />
    <main>{page === "home" ? <PublicHome catalog={catalog} /> : <PublicPage path={path} page={page} catalog={catalog} />}</main>
    <SiteFooter />
    {analytics.showSettings && <AnalyticsConsentBanner consent={analytics.consent} onChoose={analytics.choose} onClose={analytics.close} />}
  </div>;
}
