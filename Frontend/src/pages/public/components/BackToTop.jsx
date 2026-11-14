import { useScrollProgress } from "../../../hooks/useScrollProgress.js";

const RADIUS = 33;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Appears after 600px; the ring fills with scroll progress.
export default function BackToTop() {
  const { y, progress } = useScrollProgress();
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return <button type="button" className={`back-to-top ${y > 600 ? "is-visible" : ""}`} aria-label="Back to top" tabIndex={y > 600 ? 0 : -1}
    onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}>
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r={RADIUS} className="back-to-top-track" />
      <circle cx="36" cy="36" r={RADIUS} className="back-to-top-ring" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - progress)} />
    </svg>
    <span aria-hidden="true">↑</span>
  </button>;
}
