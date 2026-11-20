import { useGymContact, telLink } from "../../../hooks/useGymContact.js";

// Phone and email from the owner's contact details (nothing shown until they are saved).
function FooterContact() {
  const contact = useGymContact();
  if (!contact.isSaved) return null;
  return <p className="footer-contact">{contact.phone && <a href={telLink(contact.phone)}>{contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}</p>;
}

export default function SiteFooter() {
  return <footer className="public-footer">
    <a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>
    <p>Train hard. Eat smart. Grow faster.</p>
    <FooterContact />
    <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/agreement">Gym agreement</a><button type="button" className="analytics-preferences-link" onClick={() => window.dispatchEvent(new Event("fitconsole:analytics-preferences"))}>Analytics preferences</button></nav>
  </footer>;
}
