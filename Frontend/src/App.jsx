import { useEffect } from "react";
import { LoadingState } from "./components/ui/index.js";
import { isDocsPath, isPublicPath, publicPathAliases } from "./constants/routes.js";
import { useApiStatus } from "./hooks/useApiStatus.js";
import { usePathname } from "./hooks/usePathname.js";
import { useSession } from "./hooks/useSession.js";
import AppShell from "./layouts/AppShell.jsx";
import AuthScreen from "./pages/auth/AuthScreen.jsx";
import DocumentationSite from "./pages/docs/DocumentationSite.jsx";
import PublicSite from "./pages/public/PublicSite.jsx";

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
  if (!authChecked) return <div className="app-loading"><span className="brand-mark">F</span><LoadingState label="Restoring your session…" /></div>;
  if (docsRequested && user?.role === "owner") return <DocumentationSite />;
  if (!user) return <AuthScreen apiStatus={apiStatus} onAuthenticated={setUser} ownerLoginOnly={docsRequested} initialMode={path === "/register" ? "register" : "login"} notice={accessNotice} />;
  return <AppShell user={user} onLogout={logout} apiStatus={apiStatus} accessNotice={accessNotice} />;
}
