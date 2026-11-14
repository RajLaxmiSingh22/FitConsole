import { useEffect, useRef } from "react";
import { Button } from "../../../components/ui/index.js";
import { apiCalls, setSession } from "../../../services/api.js";
import { rememberPendingPlan } from "./PlanPicker.jsx";

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";

// Shown when the read-only demo account presses Pay. `payment` is { courseId, durationMonths, label } or { membershipId }.
export default function DemoPaymentModal({ payment, onClose }) {
  const dialog = useRef(null);

  // Focus trap: Tab cycles inside the dialog, Esc closes it, focus returns to the Pay button afterwards.
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.querySelector(FOCUSABLE)?.focus();
    function onKey(event) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const items = [...(dialog.current?.querySelectorAll(FOCUSABLE) ?? [])];
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);

  async function createAccount() {
    if (payment.courseId) rememberPendingPlan({ courseId: payment.courseId, durationMonths: payment.durationMonths });
    try { await apiCalls.auth.logout(); } catch { /* the demo session ends either way */ }
    setSession(null);
    window.location.assign("/register?section=Membership");
  }

  return <div className="demo-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title" aria-describedby="demo-modal-text">
      <span className="demo-pill">Demo</span>
      <h2 id="demo-modal-title">You're in the demo account</h2>
      <p id="demo-modal-text" className="muted">Payments are turned off here so nothing real gets charged.{payment.label ? ` You picked ${payment.label}.` : ""} Create your own account to join this plan.</p>
      <div className="demo-modal-actions">
        <Button onClick={createAccount}>Create my account</Button>
      </div>
      <button type="button" className="demo-modal-later" onClick={onClose}>Maybe later</button>
    </div>
  </div>;
}
