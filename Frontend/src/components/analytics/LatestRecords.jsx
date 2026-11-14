import { EmptyState } from "../ui/index.js";

const when = (value) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));

export default function LatestRecords({ records }) {
  if (!records.length) return <EmptyState title="No records yet" detail="Check-ins, workouts and wellness entries will appear here." />;
  return <ol className="latest-records">{records.map((record) => <li key={`${record.type}-${record.at}`}>
    <span className="latest-type">{record.type}</span>
    <span className="latest-detail">{record.detail}</span>
    <time dateTime={record.at}>{when(record.at)}</time>
    <span className="latest-source">{record.source}</span>
  </li>)}</ol>;
}
