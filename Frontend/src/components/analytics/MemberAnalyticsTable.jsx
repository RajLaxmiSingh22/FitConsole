import { useMemo, useState } from "react";
import { EmptyState, Field, StatusPill } from "../ui/index.js";
import { dateLabel, initials } from "../../utils/format.js";

const FILTERS = [
  ["all", "All members"], ["active", "Active"], ["needsAttention", "Needs attention"], ["lowAttendance", "Low attendance"],
  ["missedSessions", "Missed sessions"], ["strongAttendance", "Strong attendance"],
];
const moodLabel = { happy: "🙂 Happy", neutral: "😐 Neutral", low: "🙁 Low" };

function matches(row, filter) {
  if (filter === "all") return true;
  if (filter === "active") return row.membershipActive;
  return Boolean(row.flags?.[filter]);
}

// Searchable, filterable member table shared by the trainer and owner views.
export default function MemberAnalyticsTable({ rows, onOpen, showTrainer = false }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([key]) => [key, rows.filter((row) => matches(row, key)).length])), [rows]);
  const visible = rows.filter((row) => matches(row, filter) && row.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="member-table">
    <div className="member-table-tools">
      <Field label="Search members"><input type="search" placeholder="Name" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
      <div className="tt-filters" role="group" aria-label="Filter members">{FILTERS.map(([key, label]) => <button key={key} type="button" className={filter === key ? "is-active" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} <b>{counts[key]}</b></button>)}</div>
    </div>
    {visible.length ? <div className="table-wrap"><table>
      <thead><tr><th>Member</th>{showTrainer && <th>Coach</th>}<th>Membership</th><th>Streak</th><th>Best</th><th>Visits</th><th>Attendance</th><th>Last visit</th><th>Weight</th><th>Wellness</th></tr></thead>
      <tbody>{visible.map((row) => <tr key={row.id}>
        <td><button type="button" className="member-link" onClick={() => onOpen(row)}><span className="avatar">{initials(row.name)}</span><span><b>{row.name}</b>{row.flags.needsAttention && <small className="member-flag">! Needs attention</small>}</span></button></td>
        {showTrainer && <td>{row.trainerName ?? "—"}</td>}
        <td>{row.membershipActive ? <StatusPill tone="success">Active{row.membershipEndsOn ? ` · ${dateLabel(row.membershipEndsOn, { day: "numeric", month: "short" })}` : ""}</StatusPill> : <StatusPill tone="neutral">Inactive</StatusPill>}</td>
        <td><b>{row.currentStreak}</b></td>
        <td>{row.longestStreak}</td>
        <td>{row.totalVisits}</td>
        <td>{row.attendancePercentage == null ? "—" : <span className={`attendance-rate ${row.attendancePercentage < 60 ? "is-low" : row.attendancePercentage >= 85 ? "is-strong" : ""}`}>{row.attendancePercentage}%</span>}</td>
        <td>{row.lastVisit ? `${dateLabel(row.lastVisit, { day: "numeric", month: "short" })}${row.absentDays >= 7 ? ` (${row.absentDays}d)` : ""}` : "Never"}</td>
        <td>{row.latestWeightKg ? `${row.latestWeightKg} kg` : "—"}</td>
        <td>{row.latestWellness ? <>{moodLabel[row.latestWellness.mood] ?? row.latestWellness.mood}{row.latestWellness.pain && <StatusPill tone="danger">Pain</StatusPill>}</> : "—"}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState title="No members match" detail="Try another filter or search." />}
  </div>;
}
