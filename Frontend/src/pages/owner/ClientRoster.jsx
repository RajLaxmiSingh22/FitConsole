import { useEffect, useState } from "react";
import DownloadButton from "../../components/DownloadButton.jsx";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, Pager } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { dateLabel, initials } from "../../utils/format.js";
import ClientCreateForm from "./ClientCreateForm.jsx";

export default function ClientRoster({ trainers, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ search: "", trainerId: "" });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState({});
  const roster = useLoad(async () => responseData(await apiCalls.clients.list({
    page,
    search: filters.search || undefined,
    trainerId: filters.trainerId || undefined,
  })), [page, filters]);
  const rows = roster.data?.items ?? [];
  const total = roster.data?.pagination?.total ?? 0;

  // Wait for typing to pause before searching on the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.search === search.trim() ? current : { ...current, search: search.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function refreshAll() {
    roster.refresh();
    onRefresh();
  }

  async function assign(clientId, trainerId) {
    setError("");
    try {
      await apiCalls.clients.assignTrainer(clientId, trainerId || null);
      refreshAll();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to assign trainer."));
    }
  }

  return (
    <>
      <PageHeader eyebrow={`${total} member profiles`} title="Clients" description="Member profiles, health goals, and trainer assignments." actions={<DownloadButton label="Export clients.xlsx" download={apiCalls.exports.clients} />} />
      <Notice error={error || roster.error} />
      <Card className="roster-card">
        <div className="toolbar">
          <Field label="Search clients"><input type="search" placeholder="Search by name, email, or phone" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
          <Field label="Trainer"><select value={filters.trainerId} onChange={(event) => { setFilters({ ...filters, trainerId: event.target.value }); setPage(1); }}><option value="">All trainers</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.User?.fullName}</option>)}</select></Field>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "＋ Add client"}</Button>
        </div>
        {showForm && <ClientCreateForm trainers={trainers} onCreated={() => { setShowForm(false); refreshAll(); }} onCancel={() => setShowForm(false)} />}
        {roster.loading && !roster.data ? <LoadingState label="Loading clients…" /> : rows.length ? <><div className="table-wrap"><table>
          <thead><tr><th>Client</th><th>Phone</th><th>Goal</th><th>Joined</th><th>Assigned trainer</th></tr></thead>
          <tbody>{rows.map((client) => <tr key={client.id}>
            <td><div className="person-cell"><span className="avatar">{initials(client.User?.fullName)}</span><span><b>{client.User?.fullName ?? "New client"}</b><small>{client.User?.email}</small></span></div></td>
            <td>{client.phone || "—"}</td>
            <td>{client.goal || "—"}</td>
            <td>{dateLabel(client.joinedAt)}</td>
            <td><select className="table-select" value={assignments[client.id] ?? trainers.find((trainer) => trainer.id === client.trainerId)?.userId ?? ""} onChange={(event) => { setAssignments({ ...assignments, [client.id]: event.target.value }); assign(client.id, event.target.value); }}><option value="">Unassigned</option>{trainers.map((trainer) => <option key={trainer.userId} value={trainer.userId}>{trainer.User?.fullName}</option>)}</select></td>
          </tr>)}</tbody>
        </table></div><Pager pagination={roster.data?.pagination} onPage={setPage} disabled={roster.loading} /></> : <EmptyState title="No clients found" detail={filters.search || filters.trainerId ? "Try changing your search or trainer filter." : "Create a client profile to get started."} />}
      </Card>
    </>
  );
}
