import { Avatar, LoadingState } from "../../../components/ui/index.js";
import { courseCover } from "../../../constants/media.js";
import { currency } from "../../../utils/format.js";
import { pricedPlans } from "../../../utils/membership.js";
import { programTone } from "../../../utils/programTone.js";

const MAX_COACHES = 3;
const COLUMNS = 3;

function CoachAvatars({ trainers }) {
  const coaches = trainers.filter((trainer) => trainer.User?.fullName);
  if (!coaches.length) return <span className="muted">Gym coaches</span>;
  const names = coaches.map((trainer) => trainer.User.fullName).join(", ");
  return <span className="avatar-stack" title={names} aria-label={`Coached by ${names}`}>
    {coaches.slice(0, MAX_COACHES).map((trainer) => {
      const updatedAt = trainer.User.UserAvatar?.updatedAt;
      return <Avatar key={trainer.userId} userId={trainer.User.id ?? trainer.userId} name={trainer.User.fullName} version={updatedAt ? Date.parse(updatedAt) : null} className="avatar avatar--stack" />;
    })}
    {coaches.length > MAX_COACHES && <span className="avatar avatar--stack avatar-more" aria-hidden="true">+{coaches.length - MAX_COACHES}</span>}
  </span>;
}

// Program cards: cover, what it is, who coaches it, and the lowest monthly price (aligned at the bottom).
export default function CourseCards({ courses, loading }) {
  if (loading) return <LoadingState label="Loading programs…" />;
  if (!courses.length) return <p className="public-unconfigured">Programs are not configured yet.</p>;
  // Fill the last row's empty slots (3 columns) with a free-trial card.
  const emptySlots = (COLUMNS - (courses.length % COLUMNS)) % COLUMNS;
  return <div className="public-card-grid program-grid">{courses.map((course) => {
    const plans = pricedPlans((course.CoursePlans ?? course.Plans ?? []).filter((plan) => plan.active !== false));
    const lowestMonthly = plans.length ? Math.min(...plans.map((plan) => plan.monthly)) : null;
    const cover = courseCover(course, 800);
    return <article className={`home-card program-card program-card--cover tt-tone-${programTone(course.category)}`} key={course.id}>
      <div className="program-cover"><img src={cover.src} alt={cover.alt || `${course.name} cover`} loading="lazy" /></div>
      <span className="home-tag program-tag">{course.category || "Program"}</span>
      <h3>{course.name}</h3>
      <p>{course.description || "Ask the gym for details about this program."}</p>
      <dl className="program-facts">
        <div><dt>Coached by</dt><dd><CoachAvatars trainers={course.Trainers ?? []} /></dd></div>
        <div><dt>Plans</dt><dd>{plans.length ? `${plans.length} options, ${plans[0].durationMonths}–${plans.at(-1).durationMonths} months` : "Ask the gym"}</dd></div>
      </dl>
      <div className="program-foot">
        <span className="program-price">{lowestMonthly === null ? "Pricing on request" : <><small>From</small><b>{currency(lowestMonthly)}</b><small>per month</small></>}</span>
        <a className="button button--primary" href={`/trial?courseId=${encodeURIComponent(course.id)}`}>Try it ↗</a>
      </div>
    </article>;
  })}
    {emptySlots > 0 && <article className="home-card program-card program-card--trial" style={{ "--slots": emptySlots }} data-odd={courses.length % 2 === 1 ? "true" : undefined}>
      <span className="program-trial-mark" aria-hidden="true">?</span>
      <h3>Not sure which?</h3>
      <p>Book a free trial class. A coach will help you pick the program that fits your goals and level.</p>
      <div className="program-foot"><a className="button button--primary" href="/trial">Book a free trial ↗</a></div>
    </article>}
  </div>;
}
