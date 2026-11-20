import { gymProfile } from "../../../constants/gymProfile.js";
import { useGymContact } from "../../../hooks/useGymContact.js";

const updated = "5 November 2026";

// Describes what this application actually stores and shares; keep it in step with the backend.
const buildPrivacy = (email) => [
  ["Who we are", `${gymProfile.name} runs this website and the member app. For any privacy question, email ${email}.`],
  ["What we collect", [
    "Trial requests: name, phone, optional email, preferred program, day and time, and your message.",
    "Member accounts: name, email, password (stored only as a secure hash) and phone number.",
    "Training profile you choose to share: date of birth, height, weight, goals, diet preference, allergies, health notes and injuries, plus progress and meal check-ins.",
    "Membership, attendance and payment records (amount, method, date and invoice number).",
    "Your acceptance of the gym agreement, with the date and the network address it was accepted from.",
    "Website analytics only if you accept them: anonymous visitor and session IDs and the pages you view. No IP address or device fingerprint is stored for analytics.",
  ]],
  ["How we use it", [
    "To run your membership, check-ins, payments and receipts.",
    "To let your trainer plan your training and meals and keep you safe.",
    "To contact you about trial requests, payments, membership renewals and account security.",
    "To understand which pages help visitors, only with your analytics consent.",
  ]],
  ["Who we share it with", [
    "Cashfree Payments processes online payments. Card and UPI details are entered on Cashfree, not stored by us.",
    "Google Gemini generates draft meal plans from your age, gender, height, weight, goal, diet preference, allergies and recent progress. Your name, email and phone are not sent. A trainer reviews every plan.",
    "Our email provider (Google Gmail) delivers account and reminder emails.",
    "We do not sell your data or share it for advertising.",
  ]],
  ["How long we keep it", "Account and membership records are kept while you are a member and for as long as tax and accounting rules require afterwards. Trial requests that do not become memberships are deleted on request. Sign-in sessions expire automatically."],
  ["Your rights", "You can ask to see, correct or delete your personal data, and withdraw analytics consent at any time using Analytics preferences in the footer. Under India's Digital Personal Data Protection Act you may also raise a grievance with us, and then with the Data Protection Board of India."],
  ["Children", "Members under 18 need a parent or guardian's consent. Children's activity is not used for website analytics."],
  ["Changes", `We will update this notice when our practices change. Last updated ${updated}.`],
];

const terms = [
  ["Using this website", "The information here is for people interested in training at the gym. Class times, prices and coaches can change; the gym confirms details when you book."],
  ["Trial classes", "A trial request is not a booking until the gym confirms it. Please arrive 10 minutes early and tell your coach about any injury or health condition."],
  ["Memberships", "A membership covers the program and duration you choose and starts once your payment is confirmed by the payment provider. Membership is personal and cannot be shared or transferred."],
  ["Payments and renewals", "Prices are in Indian rupees and include applicable taxes as shown on your invoice. You will receive a reminder before your membership ends; renewals are not charged automatically."],
  ["Refunds and freezes", "Fees are not refundable except as required by law or agreed by the gym in writing. Ask the front desk about pausing a membership for medical reasons."],
  ["Gym agreement", "Before training you must accept the gym agreement, which covers health, training risks and gym rules. You can read it any time on the Gym agreement page."],
  ["Conduct", "Respect coaches, members and equipment. The gym may suspend a membership for unsafe or abusive behaviour."],
  ["Your account", "Keep your password private. You are responsible for activity on your account; tell us straight away if you think it has been misused."],
  ["Changes", `We may update these terms; the current version always appears on this page. Last updated ${updated}.`],
];

export default function LegalPage({ kind }) {
  const contact = useGymContact();
  const sections = kind === "privacy" ? buildPrivacy(contact.email) : terms;
  return <div className="static-page legal-page">
    <p className="muted">General template prepared for this demo. Have it reviewed by a legal adviser before launch.</p>
    <nav className="legal-toc" aria-label="On this page">{sections.map(([heading], index) => <a key={heading} href={`#section-${index + 1}`}>{index + 1}. {heading}</a>)}</nav>
    <div className="legal-sections">{sections.map(([heading, body], index) => <section key={heading} id={`section-${index + 1}`} className="legal-section">
      <h2>{index + 1}. {heading}</h2>
      {Array.isArray(body) ? <ul>{body.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{body}</p>}
    </section>)}</div>
  </div>;
}
