import { Notice } from "../../components/ui/index.js";
import { faqs, legalCopy, pageTitle } from "../../constants/publicContent.js";
import CourseCards from "./components/CourseCards.jsx";
import PasswordRecoveryForm from "./components/PasswordRecoveryForm.jsx";
import TrainerCards from "./components/TrainerCards.jsx";
import TrialBooking from "./components/TrialBooking.jsx";

export default function PublicPage({ path, page, catalog }) {
  const isLegal = Boolean(legalCopy[path]);
  const title = pageTitle(path);
  return <section className="public-page">
    <p className="overline"><span className="red-dot" /> FITCONSOLE · {page.replaceAll("-", " ").toUpperCase()}</p><h1>{title}</h1>
    {page === "about" && <div className="public-prose"><p>FitConsole helps your gym bring training, coaching, and member support together. Gym-specific story and facility details have not been configured here yet.</p><p>Explore current programs or request a trial to hear from the team.</p><a className="button button--primary" href="/trial">Request a trial ↗</a></div>}
    {(page === "trainers" || page === "programs" || page === "memberships") && <><Notice error={catalog.error} />{page === "trainers" ? <TrainerCards trainers={catalog.trainers} loading={catalog.loading} /> : <CourseCards courses={catalog.courses} loading={catalog.loading} />}</>}
    {page === "schedule" && <div className="public-unconfigured">Class schedule and opening hours are not configured yet. Request a trial and the gym can share current availability.</div>}
    {page === "gallery" && <div className="public-unconfigured">Gallery images are not configured yet.</div>}
    {page === "contact" && <div className="public-contact-grid"><div className="public-prose"><h2>Contact details</h2><p>Address, phone, email, and opening hours are not configured for this website yet.</p></div><div className="public-form">
      <p>Want the gym to get in touch?</p><a className="button button--primary" href="/trial">Send a trial request ↗</a>
    </div></div>}
    {page === "trial" && <TrialBooking courses={catalog.courses} />}
    {page === "faq" && <div className="public-faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>}
    {(page === "forgot-password" || page === "reset-password" || page.startsWith("reset-password/")) && <PasswordRecoveryForm page={page} path={path} />}
    {isLegal && <div className="public-prose"><p>{legalCopy[path][1]}</p></div>}
  </section>;
}
