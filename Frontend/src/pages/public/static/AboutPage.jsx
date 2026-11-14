import { gymProfile } from "../../../constants/gymProfile.js";
import { openingHoursSummary } from "../../../constants/openingHours.js";
import TrainerCards from "../components/TrainerCards.jsx";

export default function AboutPage({ catalog }) {
  const classTypes = catalog.courses.map((course) => course.name).join(", ");
  return <div className="static-page">
    <div className="static-split">
      <div className="static-copy">
        <p className="overline">OUR STORY</p>
        <h2>Built one round at a time.</h2>
        {gymProfile.story.map((paragraph) => <p key={paragraph.slice(0, 20)}>{paragraph}</p>)}
        {classTypes && <p>Programs today: <b>{classTypes}</b>.</p>}
      </div>
      <ol className="static-timeline" aria-label="Milestones">
        {gymProfile.milestones.map(([year, label]) => <li key={year}><b>{year}</b><span>{label}</span></li>)}
      </ol>
    </div>

    <section className="static-block">
      <p className="overline">WHAT WE STAND FOR</p>
      <div className="home-feature-grid static-grid-4">{gymProfile.values.map(([title, body], index) => <article key={title} className="home-card home-feature">
        <span className="home-feature-number">0{index + 1}</span><h3>{title}</h3><p>{body}</p>
      </article>)}</div>
    </section>

    <section className="static-block">
      <p className="overline">FACILITIES</p>
      <div className="static-facilities">{gymProfile.facilities.map(([title, body]) => <article key={title} className="home-card">
        <h3>{title}</h3><p>{body}</p>
      </article>)}</div>
    </section>

    <section className="static-block">
      <div className="public-section-heading"><div><p className="overline">THE TEAM</p><h2>Your coaches.</h2></div><a href="/trainers">All coaches ↗</a></div>
      <TrainerCards trainers={catalog.trainers} loading={catalog.loading} limit={4} />
    </section>

    <section className="static-callout">
      <div><h2>Come train with us.</h2><p className="muted">{openingHoursSummary.map(([days, hours]) => `${days} ${hours}`).join(" · ")}</p></div>
      <div className="row-actions"><a className="button button--outline" href="/schedule">See the timetable</a><a className="button button--primary" href="/trial">Book a trial ↗</a></div>
    </section>
  </div>;
}
