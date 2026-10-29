import { Notice } from "../../components/ui/index.js";
import CourseCards from "./components/CourseCards.jsx";

export default function PublicHome({ catalog }) {
  return <>
    <section className="public-hero">
      <div className="public-hero-copy"><p className="overline"><span className="red-dot" /> TRAIN WITH PURPOSE</p><h1>Earn your<br /><span>next round.</span></h1><p>Training, nutrition, and your gym journey — all in your corner.</p><div className="public-hero-actions"><a className="button button--primary" href="/trial">Request a trial ↗</a><a className="button button--outline" href="/programs">Explore programs</a></div></div>
      <div className="public-hero-art" aria-hidden="true"><span>FC</span><small>DISCIPLINE BUILDS<br />THE DISTANCE</small></div>
    </section>
    <section className="public-section"><div className="public-section-heading"><div><p className="overline">FIND YOUR FOCUS</p><h2>Training built around you.</h2></div><a href="/programs">All programs ↗</a></div><Notice error={catalog.error} /><CourseCards courses={catalog.courses.slice(0, 3)} loading={catalog.loading} /></section>
    <section className="public-cta"><div><p className="overline">READY WHEN YOU ARE</p><h2>Take the first step.</h2></div><a className="button button--primary" href="/trial">Book a trial ↗</a></section>
  </>;
}
