import { lazy, Suspense, useEffect } from "react";
import { LoadingState } from "./components/ui/index.js";
import { isDocsPath, isPublicPath, publicPathAliases } from "./constants/routes.js";
import { useApiStatus } from "./hooks/useApiStatus.js";
import { usePathname } from "./hooks/usePathname.js";
import { useSession } from "./hooks/useSession.js";
import AppShell from "./layouts/AppShell.jsx";
import AuthScreen from "./pages/auth/AuthScreen.jsx";
import PublicSite from "./pages/public/PublicSite.jsx";

// Owner documentation is a separate bundle.
const DocumentationSite = lazy(() => import("./pages/docs/DocumentationSite.jsx"));
const pageLoading = (label) => <div className="app-loading"><span className="brand-mark">F</span><LoadingState label={label} /></div>;

export default function App() {
  const path = usePathname();
  const docsRequested = isDocsPath(path);
  const apiStatus = useApiStatus();
  const { user, setUser, authChecked, accessNotice, setAccessNotice, logout } = useSession();

  useEffect(() => {
    if (authChecked && docsRequested && user && user.role !== "owner") {
      window.history.replaceState(null, "", "/");
      setAccessNotice("Documentation is available to owner accounts only.");
    }
  }, [authChecked, docsRequested, user, setAccessNotice]);

  if (isPublicPath(path) && !docsRequested && !(path === "/" && user)) return <PublicSite path={publicPathAliases[path] ?? path} />;
  if (!authChecked) return pageLoading("Restoring your session…");
  if (docsRequested && user?.role === "owner") return <Suspense fallback={pageLoading("Loading documentation…")}><DocumentationSite /></Suspense>;
  if (!user) return <AuthScreen apiStatus={apiStatus} onAuthenticated={setUser} ownerLoginOnly={docsRequested} initialMode={path === "/register" ? "register" : "login"} notice={accessNotice} />;
  return <AppShell user={user} onLogout={logout} apiStatus={apiStatus} accessNotice={accessNotice} />;
}
