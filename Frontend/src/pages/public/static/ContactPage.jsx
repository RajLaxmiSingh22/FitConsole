import { gymProfile } from "../../../constants/gymProfile.js";
import { useGymContact, telLink, whatsappLink } from "../../../hooks/useGymContact.js";
import OpeningHours from "../components/OpeningHours.jsx";

// Contact details come from the owner's settings (Website → Contact details); placeholders until saved.
export default function ContactPage() {
  const contact = useGymContact();
  const wa = whatsappLink(contact);
  const visibleOrPlaceholder = (text, linkHref) => (contact.isSaved && linkHref ? <a href={linkHref}>{text}</a> : <span>{text}</span>);
  return <div className="static-page">
    <div className="contact-grid">
      <div className="contact-cards">
        <article className="home-card contact-card"><span className="home-tag">Visit</span><h3>Find us</h3><p>{contact.address}</p>{contact.mapUrl && <p><a href={contact.mapUrl} target="_blank" rel="noreferrer">Open in Google Maps ↗</a></p>}</article>
        <article className="home-card contact-card"><span className="home-tag">Call</span><h3>Phone</h3><p>{visibleOrPlaceholder(contact.phone, contact.isSaved ? telLink(contact.phone) : null)}</p><p className="muted">Front desk, during opening hours</p></article>
        {contact.whatsappEnabled && <article className="home-card contact-card"><span className="home-tag">Chat</span><h3>WhatsApp</h3><p>{wa ? <a href={wa} target="_blank" rel="noreferrer">{contact.phone}</a> : <span>{contact.phone}</span>}</p><p className="muted">Quick questions and trial bookings</p></article>}
        <article className="home-card contact-card"><span className="home-tag">Write</span><h3>Email</h3><p>{visibleOrPlaceholder(contact.email, contact.isSaved && contact.email ? `mailto:${contact.email}` : null)}</p><p className="muted">For questions that can wait</p></article>
        <article className="home-card contact-card contact-wide"><span className="home-tag">Getting here</span><h3>Parking</h3><p>{gymProfile.parking}</p></article>
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
