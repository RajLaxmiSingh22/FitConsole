export default function LoadingState({ label = "Loading your workspace…" }) {
  return <div className="loading-state"><span className="loader" />{label}</div>;
}
