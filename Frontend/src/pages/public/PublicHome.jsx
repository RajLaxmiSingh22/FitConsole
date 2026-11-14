import { LoadingState, Notice } from "../../components/ui/index.js";
import { isOpenNow, openingHoursSummary } from "../../constants/openingHours.js";
import { courseCover, heroMedia } from "../../constants/media.js";
import { clampWords } from "../../utils/text.js";
import { timeLabel, todayWeekday } from "../../constants/schedule.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../services/api.js";
import Reveal from "../../components/Reveal.jsx";
import PricingCards from "./components/PricingCards.jsx";
import TrainerCards from "./components/TrainerCards.jsx";

function SectionHeading({ eyebrow, title, link, linkLabel }) {
  return <div className="public-section-heading">
    <div><p className="overline">{eyebrow}</p><h2>{title}</h2></div>
    {link && <a href={link}>{linkLabel} ↗</a>}
  </div>;
}

// "— ABOUT US" label plus a display heading; `accent` is red, `outline` is stroke-only.
function FightHeading({ eyebrow, lead, accent, outline, action }) {
  return <Reveal className="fight-heading">
    <div>
      <p className="fight-eyebrow">{eyebrow}</p>
      <h2>{lead}{lead && <br />}<span className="fight-accent">{accent}</span>{outline && <> <span className="fight-outline">{outline}</span></>}</h2>
    </div>
    {action}
  </Reveal>;
}

const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", all_levels: "All levels" };

function currentTime() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.hour}:${parts.minute}`;
}

export default function PublicHome({ catalog }) {
  const schedule = useLoad(async () => responseData(await apiCalls.schedule.list()));
  const sessions = schedule.data ?? [];
  const today = todayWeekday();
  const now = currentTime();
  const upNext = sessions.filter((session) => session.weekday === today && session.endTime > now).slice(0, 4);
  const open = isOpenNow();
  const trainersWithYears = catalog.trainers.filter((trainer) => trainer.experienceYears != null);
  const coachingYears = trainersWithYears.reduce((sum, trainer) => sum + Number(trainer.experienceYears), 0);

  const marquee = [...new Set(catalog.courses.map((course) => course.name.toUpperCase()))];

  const stats = [
    [catalog.courses.length || "—", "Programs", "Fitness, strength & combat"],
    [catalog.trainers.length || "—", "Coaches", coachingYears ? `${Math.round(coachingYears)}+ years combined` : "Coaching team"],
    [sessions.length || "—", "Classes a week", "Morning to late evening"],
    [open ? "Open" : "Closed", "Right now", openingHoursSummary[0][1] + " Mon–Sat"],
  ];

  return <>
    <section className="public-hero">
      <video className="public-hero-bg" src={heroMedia.video} poster={heroMedia.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
      <div className="public-hero-copy">
        <p className="hero-pill"><span className="hero-pill-dot" aria-hidden="true" /> Train with purpose</p>
        <h1>Earn your<br /><span className="hero-next">next</span> <span className="hero-round">round.</span></h1>
        <p>Coached <strong>fitness, strength and MMA</strong> classes, with your meal plan, check-ins and progress in one app.</p>
        <div className="public-hero-actions"><a className="button button--primary hero-cta" href="/trial">Book a free trial →</a><a className="button button--outline hero-secondary" href="/schedule">See the timetable</a></div>
      </div>
      <div className="public-hero-art" aria-hidden="true">
        <i className="hero-bracket hero-bracket--tr" /><i className="hero-bracket hero-bracket--bl" />
        <em className={open ? "hero-open is-open" : "hero-open"}>● {open ? "Open now" : "Closed now"}</em>
        <span>FC</span><small>Discipline builds the distance</small>
      </div>
      <a className="hero-scroll" href="#about" aria-label="Scroll to About us"><span /><b>Scroll</b></a>
    </section>

    <section className="home-stats" aria-label="FitConsole at a glance">
      {stats.map(([value, label, detail]) => <div key={label} className={label === "Right now" ? (open ? "is-open" : "is-closed") : ""}>
        <strong>{value}</strong><span>{label}</span><small>{detail}</small>
      </div>)}
    </section>

    <section className="public-section home-about" id="about" data-nav="/about">
      <div className="home-about-copy">
        <FightHeading eyebrow="About us" lead="A gym in" accent="your" outline="corner." />
        <Reveal index={1}><p>FitConsole is a training gym for fitness conditioning, strength and mixed martial arts. Every class is led by a coach, built around good technique and steady progress, whether it's your first session or you're getting ready to compete.</p></Reveal>
        <Reveal index={2}><p>Members get more than a workout: a personal meal plan, weekly progress check-ins and direct messages with their trainer, all inside the FitConsole app.</p></Reveal>
        <Reveal index={3}><a className="button button--outline" href="/trainers">Meet the coaches</a></Reveal>
      </div>
      <div className="home-feature-grid">
        {[
          ["01", "Coached classes", `${catalog.trainers.length || "Our"} coaches lead every session, from beginner basics to advanced sparring.`],
          ["02", "Structured programs", "Clear levels for beginners, intermediate and advanced members, plus kids and women-only classes."],
          ["03", "Meal plans", "A personal meal plan built around your goal, reviewed by your trainer."],
          ["04", "Progress tracking", "Weekly check-ins, attendance streaks and trainer chat in one member app."],
        ].map(([number, title, body], index) => <Reveal as="article" index={index} key={title} className="home-card home-feature">
          <span className="home-feature-icon" aria-hidden="true">◇</span>
          <span className="home-feature-number">{number}</span><h3>{title}</h3><p>{body}</p>
        </Reveal>)}
      </div>
    </section>

    {marquee.length > 0 && <div className="home-marquee" aria-label={`Programs: ${marquee.join(", ")}`}>
      <div className="home-marquee-track" aria-hidden="true">
        {[0, 1].map((copy) => <div key={copy} className="home-marquee-group">{Array.from({ length: Math.ceil(8 / marquee.length) }, () => marquee).flat().map((name, index) => <span key={index}>{name}<i>✦</i></span>)}</div>)}
      </div>
    </div>}

    <section className="public-section" data-nav="/programs">
      <FightHeading eyebrow="Programs" lead="" accent={<><span className="fight-plain">Pick your </span>fight.</>} action={<a className="button button--outline" href="/programs">View all programs →</a>} />
      <Notice error={catalog.error} />
      {catalog.loading ? <LoadingState label="Loading programs…" />
        : !catalog.courses.length ? <p className="public-unconfigured">Programs are not configured yet.</p>
        : <div className="fight-grid">{catalog.courses.slice(0, 5).map((course, index) => <Reveal as="article" index={index} key={course.id} className="fight-card">
          <div className="fight-cover">
            <img src={courseCover(course, 600).src} alt={courseCover(course, 600).alt || `${course.name} cover`} loading="lazy" />
            <span className="fight-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="fight-body">
            <div className="fight-tags"><span className="fight-tag">{course.category || "Program"}</span>{LEVEL_LABELS[course.level] && <small className="fight-level">{LEVEL_LABELS[course.level]}</small>}</div>
            <h3>{course.name}</h3>
            <p>{clampWords(course.description || "Ask the gym for details about this program.", 110)}</p>
          </div>
          <a href={`/trial?courseId=${encodeURIComponent(course.id)}`}>Explore →<span className="sr-only"> {course.name}</span></a>
        </Reveal>)}</div>}
    </section>

    <section className="public-section" data-nav="/memberships">
      <SectionHeading eyebrow="PRICING" title="Simple memberships." link="/memberships" linkLabel="Pricing details" />
      <PricingCards courses={catalog.courses} loading={catalog.loading} />
    </section>

    <section className="public-section" data-nav="/trainers">
      <SectionHeading eyebrow="OUR COACHES" title="Meet your corner." link="/trainers" linkLabel="All coaches" />
      <TrainerCards trainers={catalog.trainers} loading={catalog.loading} limit={4} />
    </section>

    {sessions.length > 0 && <section className="public-section" data-nav="/schedule">
      <SectionHeading eyebrow="TODAY AT FITCONSOLE" title="Up next." link="/schedule" linkLabel="Full timetable" />
      {upNext.length ? <div className="home-next-grid">{upNext.map((session) => <a key={session.id} className="home-card home-next" href={`/trial?courseId=${encodeURIComponent(session.course.id)}`}>
        <span className="home-next-time">{timeLabel(session.startTime)} – {timeLabel(session.endTime)}</span>
        <b>{session.course.name}</b>
        <small>{session.trainer ? `with ${session.trainer.name}` : "Coach to be confirmed"}{session.level ? ` · ${session.level}` : ""}</small>
        <span className="home-next-cta">Try this class ↗</span>
      </a>)}</div> : <p className="public-unconfigured">No more classes today. See the <a href="/schedule">full timetable</a> for tomorrow.</p>}
    </section>}

    <section className="public-cta"><div><p className="overline">READY WHEN YOU ARE</p><h2>Take the first step.</h2><p className="muted">Book a trial class and the gym will confirm your spot.</p></div><a className="button button--primary" href="/trial">Book a trial ↗</a></section>
  </>;
}
