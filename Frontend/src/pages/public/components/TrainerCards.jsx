import { LoadingState } from "../../../components/ui/index.js";

export default function TrainerCards({ trainers, loading }) {
  if (loading) return <LoadingState label="Loading trainer profiles…" />;
  if (!trainers.length) return <p className="public-unconfigured">Trainer profiles are not configured yet.</p>;
  return <div className="public-card-grid">{trainers.map((trainer) => <article className="public-card" key={trainer.userId ?? trainer.id}>
    <div className="public-avatar">{(trainer.User?.fullName ?? "FC").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
    <span className="overline">TRAINER</span><h3>{trainer.User?.fullName ?? "Trainer"}</h3>
    <p>{trainer.certification || "Certification not configured."}</p>
    <div className="public-card-meta">{trainer.experienceYears == null ? "Experience not configured" : `${trainer.experienceYears} years experience`}</div>
  </article>)}</div>;
}
