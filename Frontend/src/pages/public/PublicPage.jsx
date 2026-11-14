import { Notice } from "../../components/ui/index.js";
import { faqGroups, pageTitle } from "../../constants/publicContent.js";
import AgreementText from "./components/AgreementText.jsx";
import OpeningHours from "./components/OpeningHours.jsx";
import PricingCards from "./components/PricingCards.jsx";
import Timetable from "./components/Timetable.jsx";
import CourseCards from "./components/CourseCards.jsx";
import PasswordRecoveryForm from "./components/PasswordRecoveryForm.jsx";
import TrainerCards from "./components/TrainerCards.jsx";
import TrialBooking from "./components/TrialBooking.jsx";
import AboutPage from "./static/AboutPage.jsx";
import ContactPage from "./static/ContactPage.jsx";
import GalleryPage from "./static/GalleryPage.jsx";
import LegalPage from "./static/LegalPage.jsx";

export default function PublicPage({ path, page, catalog }) {
  const title = pageTitle(path);
  return <section className="public-page">
    <p className="overline"><span className="red-dot" /> FITCONSOLE · {page.replaceAll("-", " ").toUpperCase()}</p><h1>{title}</h1>
    {page === "about" && <AboutPage catalog={catalog} />}
    {(page === "trainers" || page === "programs" || page === "memberships") && <><Notice error={catalog.error} />{page === "trainers" ? <TrainerCards trainers={catalog.trainers} loading={catalog.loading} /> : page === "memberships" ? <PricingCards courses={catalog.courses} loading={catalog.loading} /> : <CourseCards courses={catalog.courses} loading={catalog.loading} />}</>}
    {page === "schedule" && <><OpeningHours /><Timetable /></>}
    {page === "gallery" && <GalleryPage />}
    {page === "contact" && <ContactPage />}
    {page === "trial" && <TrialBooking courses={catalog.courses} />}
    {page === "agreement" && <AgreementText />}
    {page === "faq" && <div className="faq-groups">{faqGroups.map(([group, items]) => <section key={group} className="faq-group"><h2>{group}</h2><div className="public-faq">{items.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>)}<div className="static-callout"><div><h2>Still have a question?</h2><p className="muted">Ask us on the contact page or book a trial and talk to a coach.</p></div><div className="row-actions"><a className="button button--outline" href="/contact">Contact us</a><a className="button button--primary" href="/trial">Book a trial ↗</a></div></div></div>}
    {(page === "forgot-password" || page === "reset-password" || page.startsWith("reset-password/")) && <PasswordRecoveryForm page={page} path={path} />}
    {(page === "privacy" || page === "terms") && <LegalPage kind={page} />}
  </section>;
}
