import { useEffect, useState } from "react";
import { publicLinks } from "../../../constants/publicContent.js";
import { usePathname } from "../../../hooks/usePathname.js";
import { useScrollProgress } from "../../../hooks/useScrollProgress.js";

// Highlights the link for the home-page section on screen (sections carry data-nav="/about" etc.).
function useActiveSection(pathname) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    setActive(null);
    const sections = [...document.querySelectorAll("[data-nav]")];
    if (!sections.length || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.dataset.nav);
    }, { rootMargin: "-40% 0px -50% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);
  return active;
}

// `minimal` shows only the logo, for focused pages such as password recovery.
export default function SiteHeader({ minimal = false }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { y, progress } = useScrollProgress();
  const section = useActiveSection(pathname);
  const current = section ?? pathname;
  const brand = <a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>;
  if (minimal) return <header className="public-header">{brand}</header>;
  return <header className={`public-header ${y > 50 ? "is-scrolled" : ""}`}>
    {brand}
    <button className="public-menu-toggle" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
    <nav className={open ? "public-nav is-open" : "public-nav"} aria-label="Public navigation">
      {publicLinks.map(([label, href]) => <a key={href} href={href} aria-current={current === href ? "page" : undefined}>{label}</a>)}
      <a href="/login">Sign in</a><a className="button button--primary public-nav-cta" href="/trial">Book a trial</a>
    </nav>
    <span className="public-header-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
  </header>;
}
