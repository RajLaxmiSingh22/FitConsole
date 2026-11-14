import { useState } from "react";
import { Button, Field, Notice } from "../ui/index.js";
import { apiCalls, getApiError } from "../../services/api.js";

const scales = [["energy", "Energy"], ["stress", "Stress"], ["motivation", "Motivation"], ["soreness", "Muscle soreness"], ["digestion", "Digestion (1 poor – 5 good)"]];
const moods = [["happy", "🙂 Happy"], ["neutral", "😐 Neutral"], ["low", "🙁 Low"]];

// Client's own daily check-in; saving again the same day updates it.
export default function WellnessForm({ clientId, today, onSaved }) {
  const [form, setForm] = useState({ mood: "", energy: 3, stress: 3, motivation: 3, soreness: 2, digestion: 3, sleepHours: "", pain: false, problem: "", notes: "", ...today });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const set = (changes) => setForm((current) => ({ ...current, ...changes }));
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiCalls.clients.saveWellness(clientId, { ...form, sleepHours: form.sleepHours === "" ? null : Number(form.sleepHours) });
      setNotice("Saved. Your trends update straight away.");
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save your check-in."));
    } finally {
      setSaving(false);
    }
  }
  return <form className="wellness-form" onSubmit={save}>
    <Notice error={error} />
    <Notice tone="success" error={notice} />
    <fieldset className="wellness-moods"><legend>How do you feel today?</legend>{moods.map(([value, label]) => <label key={value} className={`diet-chip ${form.mood === value ? "is-on" : ""}`}><input type="radio" name="mood" required checked={form.mood === value} onChange={() => set({ mood: value })} />{label}</label>)}</fieldset>
    <div className="wellness-scales">{scales.map(([key, label]) => <label key={key} className="wellness-scale">
      <span>{label} <b>{form[key]}/5</b></span>
      <input type="range" min="1" max="5" step="1" value={form[key]} onChange={(event) => set({ [key]: Number(event.target.value) })} />
    </label>)}</div>
    <div className="form-grid">
      <Field label="Sleep last night (hours)"><input type="number" min="0" max="24" step="0.5" value={form.sleepHours} onChange={(event) => set({ sleepHours: event.target.value })} /></Field>
      <label className="checkbox-field wellness-pain"><input type="checkbox" checked={form.pain} onChange={(event) => set({ pain: event.target.checked })} /><span>I have pain or an injury</span></label>
      {form.pain && <Field label="What's bothering you?" className="field--wide"><textarea rows="2" maxLength="1000" value={form.problem} onChange={(event) => set({ problem: event.target.value })} /></Field>}
      <Field label="Notes (optional)" className="field--wide"><textarea rows="2" maxLength="1000" value={form.notes} onChange={(event) => set({ notes: event.target.value })} /></Field>
      <div className="form-actions"><Button type="submit" disabled={saving || !form.mood}>{saving ? "Saving…" : "Save today's check-in"}</Button></div>
    </div>
    <p className="muted wellness-disclaimer">This is a personal wellbeing log to help you and your coach, not a medical assessment. For pain or injury, speak to a doctor.</p>
  </form>;
}
