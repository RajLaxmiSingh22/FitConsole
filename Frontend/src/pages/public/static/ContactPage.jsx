import { formattedAddress, gymProfile } from "../../../constants/gymProfile.js";
import OpeningHours from "../components/OpeningHours.jsx";

export default function ContactPage() {
  const { address, phone, whatsapp, email, parking } = gymProfile;
  const digits = (value) => value.replace(/[^\d+]/g, "");
  const link = (href, label) => <a href={href}>{label}</a>;
  return <div className="static-page">
    <div className="contact-grid">
      <div className="contact-cards">
        <article className="home-card contact-card"><span className="home-tag">Visit</span><h3>Find us</h3><p>{formattedAddress()}</p><p className="muted">{address.landmark}</p></article>
        <article className="home-card contact-card"><span className="home-tag">Call</span><h3>Phone</h3><p>{link(`tel:${digits(phone)}`, phone)}</p><p className="muted">Front desk, during opening hours</p></article>
        <article className="home-card contact-card"><span className="home-tag">Chat</span><h3>WhatsApp</h3><p>{link(`https://wa.me/${digits(whatsapp).replace("+", "")}`, whatsapp)}</p><p className="muted">Quick questions and trial bookings</p></article>
        <article className="home-card contact-card"><span className="home-tag">Write</span><h3>Email</h3><p>{link(`mailto:${email}`, email)}</p><p className="muted">For questions that can wait</p></article>
        <article className="home-card contact-card contact-wide"><span className="home-tag">Getting here</span><h3>Parking</h3><p>{parking}</p></article>
      </div>
      <div className="contact-side">
        <OpeningHours />
        <div className="home-card contact-cta">
          <h3>Want to try a class?</h3>
          <p>Send a trial request with your preferred day and time, and the front desk will confirm your spot.</p>
          <a className="button button--primary" href="/trial">Send a trial request ↗</a>
        </div>
      </div>
    </div>
  </div>;
}
