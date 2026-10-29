import { useState } from "react";
import { Button, Card, EmptyState, Field, Notice, PageHeader } from "../../components/ui/index.js";
import { apiCalls, getApiError } from "../../services/api.js";
import { today } from "../../utils/dates.js";
import { dateLabel } from "../../utils/format.js";

export default function DailyCheckIn({ entries, clientId, onSaved }) {
  const [form, setForm] = useState({ weightKg: "", sleepDurationHours: "", calories: "", waterLiters: "", hunger: "", mood: "", triggers: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const todaysEntries = entries.filter((entry) => entry.recordedOn === today());
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { recordedOn: today() };
    if (form.weightKg !== "") payload.weightKg = Number(form.weightKg);
    if (form.sleepDurationHours !== "") payload.sleepDurationHours = Number(form.sleepDurationHours);
    if (form.calories !== "") payload.calories = Number(form.calories);
    if (form.waterLiters !== "") payload.waterLiters = Number(form.waterLiters);
    if (form.hunger) payload.hunger = form.hunger;
    if (form.mood) payload.mood = form.mood;
    if (form.triggers) payload.triggers = form.triggers;
    try {
      await apiCalls.clients.createDietEntry(clientId, payload);
      setForm({ weightKg: "", sleepDurationHours: "", calories: "", waterLiters: "", hunger: "", mood: "", triggers: "" });
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save your check-in."));
    } finally {
      setSaving(false);
    }
  }
  return <>
    <PageHeader eyebrow="Daily tracker" title="Check in with yourself" description="A few details help you and your coach notice the patterns that matter." />
    {todaysEntries.length > 0 && <Notice tone="warning" error="You’ve already logged today. You can add another entry if you need to update your record." />}
    <Notice error={error} />
    <Card title="Today’s check-in" eyebrow={dateLabel(today())}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Weight (kg)"><input type="number" min="0.1" max="500" step="0.1" placeholder="e.g. 72.5" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} /></Field>
        <Field label="Sleep (hours)"><input type="number" min="0" max="24" step="0.5" placeholder="e.g. 7.5" value={form.sleepDurationHours} onChange={(event) => setForm({ ...form, sleepDurationHours: event.target.value })} /></Field>
        <Field label="Calories"><input type="number" min="0" step="1" placeholder="Optional" value={form.calories} onChange={(event) => setForm({ ...form, calories: event.target.value })} /></Field>
        <Field label="Water (litres)"><input type="number" min="0" max="50" step="0.1" placeholder="e.g. 2.5" value={form.waterLiters} onChange={(event) => setForm({ ...form, waterLiters: event.target.value })} /></Field>
        <Field label="Hunger"><select value={form.hunger} onChange={(event) => setForm({ ...form, hunger: event.target.value })}><option value="">Select</option><option>Low</option><option>Balanced</option><option>High</option></select></Field>
        <Field label="Mood"><select value={form.mood} onChange={(event) => setForm({ ...form, mood: event.target.value })}><option value="">Select</option><option>Great</option><option>Good</option><option>Okay</option><option>Low</option></select></Field>
        <Field className="field--wide" label="Notes or triggers"><textarea rows="3" maxLength="2000" placeholder="Anything you’d like your coach to know?" value={form.triggers} onChange={(event) => setForm({ ...form, triggers: event.target.value })} /></Field>
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save check-in"}</Button></div>
      </form>
    </Card>
    <Card title="Your recent check-ins" eyebrow="Progress history">
      {entries.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Sleep</th><th>Calories</th><th>Water</th><th>Mood</th></tr></thead><tbody>{entries.slice(0, 12).map((entry) => <tr key={entry.id}><td>{dateLabel(entry.recordedOn)}</td><td>{entry.weightKg ? `${entry.weightKg} kg` : "—"}</td><td>{entry.sleepDurationHours ? `${entry.sleepDurationHours} h` : "—"}</td><td>{entry.calories ?? "—"}</td><td>{entry.waterLiters ? `${entry.waterLiters} L` : "—"}</td><td>{entry.mood || "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="Your first check-in starts here" detail="Entries you save will show up in this progress log." />}
    </Card>
  </>;
}
