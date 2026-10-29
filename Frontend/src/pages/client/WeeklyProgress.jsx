import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { dateLabel } from "../../utils/format.js";

export default function WeeklyProgress({ clientId }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ weightKg: "", stamina: "", note: "" });
  const [state, setState] = useState({ loading: true, saving: false, error: "", message: "" });
  async function load() {
    try {
      setEntries(responseData(await apiCalls.clients.progress(clientId)) ?? []);
      setState((current) => ({ ...current, loading: false }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getApiError(error, "Unable to load weekly progress.") }));
    }
  }
  useEffect(() => { if (clientId) load(); }, [clientId]);
  async function submit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "", message: "" }));
    try {
      await apiCalls.clients.logProgress(clientId, {
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        stamina: form.stamina ? Number(form.stamina) : null,
        note: form.note || null,
      });
      setForm({ weightKg: "", stamina: "", note: "" });
      setState((current) => ({ ...current, saving: false, message: "Weekly progress saved." }));
      await load();
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: getApiError(error, "Unable to save weekly progress.") }));
    }
  }
  return <Card title="Weekly progress" eyebrow="Helps your coach adjust your plan">
    <Notice error={state.error} />
    <Notice tone="success" error={state.message} />
    <form className="form-grid" onSubmit={submit}>
      <Field label="Weight (kg)"><input type="number" min="20" max="400" step="0.1" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} /></Field>
      <Field label="Stamina (1–10)"><input type="number" min="1" max="10" step="1" value={form.stamina} onChange={(event) => setForm({ ...form, stamina: event.target.value })} /></Field>
      <Field label="Note"><input maxLength="500" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
      <div className="form-actions"><Button type="submit" disabled={state.saving || !(form.weightKg || form.stamina || form.note)}>{state.saving ? "Saving…" : "Save weekly progress"}</Button></div>
    </form>
    {state.loading ? <LoadingState label="Loading progress…" /> : entries.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Stamina</th><th>Note</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{dateLabel(entry.recordedAt)}</td><td>{entry.weightKg ? `${entry.weightKg} kg` : "—"}</td><td>{entry.stamina ? `${entry.stamina}/10` : "—"}</td><td>{entry.staminaNotes || "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="No weekly progress yet" detail="Log your weight and stamina once a week." />}
  </Card>;
}
