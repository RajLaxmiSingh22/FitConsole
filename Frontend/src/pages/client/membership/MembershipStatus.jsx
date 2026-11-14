import { Button } from "../../../components/ui/index.js";
import { currency, dateLabel } from "../../../utils/format.js";
import { daysUntil, dueAmount, isOpenMembership, periodProgress } from "../../../utils/membership.js";
import AgreementConsent from "./AgreementConsent.jsx";

// Top-of-page summary: an unpaid balance first, then the active plan, otherwise a prompt to choose one.
export default function MembershipStatus({ memberships, canPay, consent, lockedReason, busy, payingId, onPay }) {
  const open = memberships.filter(isOpenMembership);
  const unpaid = open.find((membership) => dueAmount(membership) > 0);
  const active = open.find((membership) => membership.status === "active");

  if (unpaid) {
    const due = dueAmount(unpaid);
    return <section className="mship-hero mship-hero--due" aria-label="Payment due">
      <div className="mship-hero-copy">
        <p className="overline">PAYMENT DUE</p>
        <h2>{currency(due)} to pay</h2>
        <p className="muted">{unpaid.Course?.name ?? "Gym membership"} · {dateLabel(unpaid.startDate)} – {dateLabel(unpaid.endDate)}</p>
        {!canPay && !consent.needed && <p className="mship-hint">{lockedReason}</p>}
      </div>
      <div className="mship-hero-pay">
        {consent.needed && <AgreementConsent checked={consent.checked} onChange={consent.onChange} disabled={busy} />}
        <Button className="mship-hero-action" disabled={!canPay || busy} onClick={() => onPay(unpaid.id)}>
          {payingId === unpaid.id ? "Opening secure checkout…" : `Pay ${currency(due)} now`}
        </Button>
      </div>
    </section>;
  }

  if (active) {
    const days = daysUntil(active.endDate);
    const progress = periodProgress(active.startDate, active.endDate);
    const endingSoon = days <= 7;
    return <section className={`mship-hero ${endingSoon ? "mship-hero--due" : "mship-hero--active"}`} aria-label="Current membership">
      <div className="mship-hero-copy">
        <p className="overline">{endingSoon ? "ENDING SOON" : "ACTIVE MEMBERSHIP"}</p>
        <h2>{active.Course?.name ?? "Gym membership"}</h2>
        <p className="muted">
          {days > 1 ? `${days} days left` : days === 1 ? "Ends tomorrow" : days === 0 ? "Ends today" : "Ended"} · until {dateLabel(active.endDate)}
        </p>
        <div className="mship-progress" role="progressbar" aria-label="Membership period used" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      {endingSoon && <a className="button button--primary mship-hero-action" href="#choose-plan">Renew now</a>}
    </section>;
  }

  return <section className="mship-hero" aria-label="No active membership">
    <div className="mship-hero-copy">
      <p className="overline">NO ACTIVE MEMBERSHIP</p>
      <h2>Start training today.</h2>
      <p className="muted">Pick a course and duration below and pay securely online.</p>
    </div>
    <a className="button button--primary mship-hero-action" href="#choose-plan">See plans ↓</a>
  </section>;
}
