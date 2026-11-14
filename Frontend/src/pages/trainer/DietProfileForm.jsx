import { useEffect, useState } from "react";
import { Button, Field, Notice, StatusPill } from "../../components/ui/index.js";
import { allergyOptions, dietOptions, goalOptions } from "../../constants/memberOptions.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

// The four details the server needs to calculate diet targets.
export const requiredDietFields = [["dateOfBirth", "Date of birth"], ["heightCm", "Height"], ["weightKg", "Weight"], ["goalCategory", "Goal"]];

const emptyProfile = { dateOfBirth: "", gender: "", heightCm: "", weightKg: "", goalCategory: "", dietPreference: "", allergies: [] };

function fromClient(client) {
  return {
    dateOfBirth: client?.dateOfBirth ?? "",
    gender: client?.gender ?? "",
    heightCm: client?.heightCm ?? "",
    weightKg: client?.weightKg ?? "",
    goalCategory: client?.goalCategory ?? "",
    dietPreference: client?.dietPreference ?? "",
    allergies: client?.allergies ?? [],
  };
}

export function missingDietFields(profile) {
  return requiredDietFields.filter(([key]) => !profile?.[key] || (["heightCm", "weightKg"].includes(key) && !(Number(profile[key]) > 0)));
}

// Coach-editable diet profile; reports whether a plan can be generated through onReadyChange.
export default function DietProfileForm({ clientId, onReadyChange }) {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const missing = missingDietFields(saved);
  const set = (changes) => setForm((current) => ({ ...current, ...changes }));

  useEffect(() => {
    let active = true;
    apiCalls.clients.get(clientId).then((response) => {
      if (!active) return;
      const client = responseData(response);
      setSaved(fromClient(client));
      setForm(fromClient(client));
    }).catch((requestError) => active && setError(getApiError(requestError, "Unable to load the client profile.")));
    return () => { active = false; };
  }, [clientId]);

  useEffect(() => { onReadyChange(Boolean(saved) && !missing.length); }, [saved, missing.length, onReadyChange]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        heightCm: form.heightCm === "" ? null : Number(form.heightCm),
        weightKg: form.weightKg === "" ? null : Number(form.weightKg),
        goalCategory: form.goalCategory || null,
        dietPreference: form.dietPreference || null,
        allergies: form.allergies,
      };
      const client = responseData(await apiCalls.clients.update(clientId, payload));
      setSaved(fromClient(client));
      setNotice(missingDietFields(fromClient(client)).length ? "Saved. A few details are still needed." : "Profile saved. You can generate a diet plan now.");
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save the profile."));
    } finally {
      setSaving(false);
    }
  }

  const needed = (key) => missing.some(([field]) => field === key) && <StatusPill tone="warning">Needed</StatusPill>;
  const today = new Date().toISOString().slice(0, 10);

  return <form className="diet-profile" onSubmit={save}>
    <div className="diet-profile-head">
      <div><b>Diet profile</b><small>{!saved ? "Loading…" : missing.length ? `Add ${missing.map(([, label]) => label.toLowerCase()).join(", ")} to create a plan.` : "Complete — ready for a plan."}</small></div>
      <StatusPill tone={missing.length ? "warning" : "success"}>{!saved ? "…" : missing.length ? `${missing.length} missing` : "Ready"}</StatusPill>
    </div>
    <Notice error={error} />
    <Notice tone="success" error={notice} />
    <div className="form-grid">
      <Field label={<>Date of birth {needed("dateOfBirth")}</>}><input type="date" max={today} value={form.dateOfBirth} onChange={(event) => set({ dateOfBirth: event.target.value })} /></Field>
      <Field label="Gender"><select value={form.gender} onChange={(event) => set({ gender: event.target.value })}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></Field>
      <Field label={<>Height (cm) {needed("heightCm")}</>}><input type="number" min="50" max="250" step="0.1" value={form.heightCm} onChange={(event) => set({ heightCm: event.target.value })} /></Field>
      <Field label={<>Weight (kg) {needed("weightKg")}</>}><input type="number" min="20" max="300" step="0.1" value={form.weightKg} onChange={(event) => set({ weightKg: event.target.value })} /></Field>
      <Field label={<>Goal {needed("goalCategory")}</>}><select value={form.goalCategory} onChange={(event) => set({ goalCategory: event.target.value })}><option value="">Choose a goal</option>{goalOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Diet preference"><select value={form.dietPreference} onChange={(event) => set({ dietPreference: event.target.value })}><option value="">Not specified (non-veg)</option>{dietOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <fieldset className="diet-allergies field--wide"><legend>Allergies</legend>{allergyOptions.map(([value, label]) => <label key={value} className={`diet-chip ${form.allergies.includes(value) ? "is-on" : ""}`}>
        <input type="checkbox" checked={form.allergies.includes(value)} onChange={(event) => set({ allergies: event.target.checked ? [...form.allergies, value] : form.allergies.filter((item) => item !== value) })} />{label}
      </label>)}</fieldset>
      <div className="form-actions"><Button type="submit" variant={missing.length ? "primary" : "outline"} disabled={saving || !saved}>{saving ? "Saving…" : "Save profile"}</Button></div>
    </div>
  </form>;
}
