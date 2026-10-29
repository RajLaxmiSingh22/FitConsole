import { useEffect } from "react";

// Lets other components switch the active section with a "fitconsole:navigate" event.
export function useNavigationEvents(links, setSection) {
  useEffect(() => {
    const handleNavigation = (event) => {
      const requested = typeof event.detail === "string" ? event.detail : "";
      if (links.some(([label]) => label === requested)) setSection(requested);
    };
    window.addEventListener("fitconsole:navigate", handleNavigation);
    return () => window.removeEventListener("fitconsole:navigate", handleNavigation);
  }, [links, setSection]);
}
