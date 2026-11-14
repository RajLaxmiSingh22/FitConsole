import { Avatar, LoadingState } from "../../../components/ui/index.js";
import { programTone } from "../../../utils/programTone.js";

// Coach intro cards from the trainers' public profiles.
export default function TrainerCards({ trainers, loading, limit }) {
  if (loading) return <LoadingState label="Loading trainer profiles…" />;
  if (!trainers.length) return <p className="public-unconfigured">Trainer profiles are not configured yet.</p>;
  return <div className="trainer-grid-public">{trainers.slice(0, limit).map((trainer) => {
    const name = trainer.User?.fullName ?? "Trainer";
    const years = trainer.experienceYears == null ? null : Number(trainer.experienceYears);
    const courses = trainer.Courses ?? [];
    const primary = courses[0];
    return <article className={`home-card trainer-card tt-tone-${programTone(primary?.category)}`} key={trainer.userId ?? trainer.id}>
      <div className="trainer-band" aria-hidden="true" />
      <Avatar userId={trainer.userId} name={name} version={trainer.avatarVersion} className="trainer-avatar" />
      <div className="trainer-identity"><h3>{name}</h3><span className="trainer-role">{primary ? `${primary.name} coach` : "Coach"}</span></div>
      {trainer.bio && <p className="trainer-bio">{trainer.bio}</p>}
      <div className="trainer-stats">
        <div><b>{years !== null ? `${Number.isInteger(years) ? years : years.toFixed(1)}+` : "—"}</b><small>Years coaching</small></div>
        <div><b>{trainer.certification || "—"}</b><small>Certification</small></div>
      </div>
      {trainer.achievements?.length > 0 && <ul className="trainer-achievements" aria-label="Achievements">{trainer.achievements.slice(0, 3).map((item) => <li key={item}><span aria-hidden="true">★</span>{item}</li>)}</ul>}
      {(trainer.specialties?.length ? trainer.specialties : courses.map((course) => course.name)).length > 0 && <div className="trainer-teaches">{(trainer.specialties?.length ? trainer.specialties : courses.map((course) => course.name)).map((tag) => <span key={tag} className="home-tag">{tag}</span>)}</div>}
      <a className="button button--outline trainer-cta" href={primary ? `/trial?courseId=${encodeURIComponent(primary.id)}` : "/trial"}>Train with {name.split(/\s+/)[0]} ↗</a>
    </article>;
  })}</div>;
}
