import { Button, EmptyState, StatusPill } from "../../../components/ui/index.js";
import { currency, dateLabel } from "../../../utils/format.js";
import { dueAmount, isOpenMembership, paidAmount } from "../../../utils/membership.js";

const statusTone = { active: "success", pending_payment: "warning", expired: "warning", cancelled: "neutral" };
const statusLabel = { active: "Active", pending_payment: "Awaiting payment", expired: "Expired", cancelled: "Cancelled" };
const methodLabel = { upi: "UPI", card: "Card", cash: "Cash" };

export function MembershipList({ memberships, canPay, busy, payingId, onPay }) {
  if (!memberships.length) {
    return <EmptyState title="No memberships yet" detail="Your plans will appear here after you choose one." />;
  }
  return <div className="mship-history">{memberships.map((membership) => {
    const due = dueAmount(membership);
    const showPay = isOpenMembership(membership) && due > 0;
    return <article className="mship-history-row" key={membership.id}>
      <div>
        <b>{membership.Course?.name ?? "Gym membership"}</b>
        <small>{dateLabel(membership.startDate)} – {dateLabel(membership.endDate)}</small>
      </div>
      <StatusPill tone={statusTone[membership.status] ?? "neutral"}>{statusLabel[membership.status] ?? membership.status}</StatusPill>
      <div className="mship-history-amount">
        <strong>{currency(membership.totalAmount)}</strong>
        <small>{due > 0 ? `${currency(paidAmount(membership))} paid · ${currency(due)} due` : "Fully paid"}</small>
      </div>
      {showPay && <Button variant="outline" disabled={!canPay || busy} onClick={() => onPay(membership.id)}>
        {payingId === membership.id ? "Opening…" : `Pay ${currency(due)}`}
      </Button>}
    </article>;
  })}</div>;
}

export function PaymentList({ payments }) {
  if (!payments.length) {
    return <EmptyState title="No payments yet" detail="Your receipts will appear here after your first payment." />;
  }
  return <div className="mship-history">{payments.map((payment) => <article className="mship-history-row" key={payment.id}>
    <div>
      <b>{currency(payment.amount)}</b>
      <small>{dateLabel(payment.dateTime)} · {methodLabel[payment.paymentMethod] ?? payment.paymentMethod ?? "—"}</small>
    </div>
    <StatusPill tone={payment.voidedAt ? "warning" : "success"}>{payment.voidedAt ? "Voided" : "Paid"}</StatusPill>
  </article>)}</div>;
}
