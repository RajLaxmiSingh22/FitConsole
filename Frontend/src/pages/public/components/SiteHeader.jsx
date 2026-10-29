import { useState } from "react";
import { publicLinks } from "../../../constants/publicContent.js";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="public-header">
    <a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>
    <button className="public-menu-toggle" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
    <nav className={open ? "public-nav is-open" : "public-nav"} aria-label="Public navigation">
      {publicLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      <a href="/login">Sign in</a><a className="button button--primary" href="/trial">Book a trial</a>
    </nav>
  </header>;
}
