import { LoadingState } from "../../../components/ui/index.js";

export default function CourseCards({ courses, loading }) {
  if (loading) return <LoadingState label="Loading programs…" />;
  if (!courses.length) return <p className="public-unconfigured">Programs are not configured yet.</p>;
  return <div className="public-card-grid">{courses.map((course) => {
    const plans = (course.CoursePlans ?? course.Plans ?? []).filter((plan) => plan.active !== false);
    const prices = plans.map((plan) => Number(plan.price)).filter(Number.isFinite);
    const price = prices.length ? Math.min(...prices) : null;
    return <article className="public-card" key={course.id}>
      <span className="overline">{course.category || "PROGRAM"}</span><h3>{course.name}</h3>
      <p>{course.description || "Program details are not configured."}</p>
      <div className="public-card-meta">{price === null ? "Pricing not configured" : `From ₹${price.toLocaleString("en-IN")}`}</div>
      <a className="text-button" href={`/trial?courseId=${encodeURIComponent(course.id)}`}>Ask about this program ↗</a>
    </article>;
  })}</div>;
}
