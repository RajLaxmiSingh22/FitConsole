import { LoadingState } from "../../../components/ui/index.js";
import { currency } from "../../../utils/format.js";
import { pricedPlans } from "../../../utils/membership.js";
import { courseCover } from "../../../constants/media.js";
import { programTone } from "../../../utils/programTone.js";

// Program cards: what it is, who coaches it, and the lowest monthly price.
export default function CourseCards({ courses, loading }) {
  if (loading) return <LoadingState label="Loading programs…" />;
  if (!courses.length) return <p className="public-unconfigured">Programs are not configured yet.</p>;
  return <div className="public-card-grid">{courses.map((course) => {
    const plans = pricedPlans((course.CoursePlans ?? course.Plans ?? []).filter((plan) => plan.active !== false));
    const lowestMonthly = plans.length ? Math.min(...plans.map((plan) => plan.monthly)) : null;
    const coaches = (course.Trainers ?? []).map((trainer) => trainer.User?.fullName).filter(Boolean);
    const cover = courseCover(course, 800);
    return <article className={`home-card program-card program-card--cover tt-tone-${programTone(course.category)}`} key={course.id}>
      <div className="program-cover"><img src={cover.src} alt={cover.alt} loading="lazy" /></div>
      <span className="program-watermark" aria-hidden="true">{course.name.charAt(0)}</span>
      <span className="home-tag program-tag">{course.category || "Program"}</span>
      <h3>{course.name}</h3>
      <p>{course.description || "Ask the gym for details about this program."}</p>
      <dl className="program-facts">
        <div><dt>Coached by</dt><dd>{coaches.length ? coaches.join(", ") : "Gym coaches"}</dd></div>
        <div><dt>Plans</dt><dd>{plans.length ? `${plans.length} options, ${plans[0].durationMonths}–${plans.at(-1).durationMonths} months` : "Ask the gym"}</dd></div>
      </dl>
      <div className="program-foot">
        <span className="program-price">{lowestMonthly === null ? "Pricing on request" : <><small>From</small><b>{currency(lowestMonthly)}</b><small>per month</small></>}</span>
        <a className="button button--primary" href={`/trial?courseId=${encodeURIComponent(course.id)}`}>Try it ↗</a>
      </div>
    </article>;
  })}</div>;
}
