import { Field } from "../../components/ui/index.js";

const WORKOUT_TYPES = ["MMA", "Boxing", "General fitness & conditioning", "Strength training", "Kids martial arts"];
const split = (text) => text.split(",").map((item) => item.trim()).filter(Boolean);

// Target weight, workout preferences and temporary diet restrictions, edited by the member.
export default function FitnessProfileFields({ form, setForm }) {
  const workout = form.workoutProfile ?? { types: [], minutesMin: "", minutesMax: "", notes: "" };
  const restrictions = form.dietRestrictions;
  const setWorkout = (changes) => setForm({ ...form, workoutProfile: { ...workout, ...changes } });
  const setRestrictions = (changes) => setForm({ ...form, dietRestrictions: { ...(restrictions ?? { avoid: [], suitable: [], active: true }), ...changes } });
  const toggleType = (type) => setWorkout({ types: workout.types.includes(type) ? workout.types.filter((item) => item !== type) : [...workout.types, type] });
  return <>
    <Field label="Target weight (kg)"><input type="number" min="20" max="300" step="0.1" value={form.targetWeightKg} onChange={(event) => setForm({ ...form, targetWeightKg: event.target.value })} /></Field>
    <Field label="Health notes (self-reported)" className="field--wide"><input maxLength="500" placeholder="e.g. conditions your coach should know about" value={form.healthIssues} onChange={(event) => setForm({ ...form, healthIssues: event.target.value })} /></Field>
    <fieldset className="diet-allergies field--wide"><legend>Workout types</legend>{WORKOUT_TYPES.map((type) => <label key={type} className={`diet-chip ${workout.types.includes(type) ? "is-on" : ""}`}><input type="checkbox" checked={workout.types.includes(type)} onChange={() => toggleType(type)} />{type}</label>)}</fieldset>
    <Field label="Usual workout: from (minutes)"><input type="number" min="5" max="300" value={workout.minutesMin ?? ""} onChange={(event) => setWorkout({ minutesMin: event.target.value })} /></Field>
    <Field label="to (minutes)"><input type="number" min="5" max="300" value={workout.minutesMax ?? ""} onChange={(event) => setWorkout({ minutesMax: event.target.value })} /></Field>
    <fieldset className="restriction-editor field--wide">
      <legend>Temporary diet restrictions</legend>
      {restrictions ? <>
        <label className="checkbox-field"><input type="checkbox" checked={restrictions.active !== false} onChange={(event) => setRestrictions({ active: event.target.checked })} /><span>Still following these restrictions (untick only when your doctor says you can stop)</span></label>
        <Field label="Avoid (comma-separated)"><input value={(restrictions.avoid ?? []).join(", ")} onChange={(event) => setRestrictions({ avoid: split(event.target.value) })} /></Field>
        <Field label="Suitable options (comma-separated)"><input value={(restrictions.suitable ?? []).join(", ")} onChange={(event) => setRestrictions({ suitable: split(event.target.value) })} /></Field>
        <Field label="Advised by"><input maxLength="120" value={restrictions.source ?? ""} onChange={(event) => setRestrictions({ source: event.target.value })} /></Field>
        <Field label="Review on"><input type="date" value={restrictions.reviewOn ?? ""} onChange={(event) => setRestrictions({ reviewOn: event.target.value || null })} /></Field>
      </> : <button type="button" className="text-button" onClick={() => setRestrictions({})}>＋ Add temporary diet restrictions</button>}
    </fieldset>
  </>;
}

// Shapes the fields for PATCH /clients/me.
export function fitnessProfilePayload(form) {
  const workout = form.workoutProfile;
  return {
    targetWeightKg: form.targetWeightKg === "" ? null : Number(form.targetWeightKg),
    healthIssues: form.healthIssues || null,
    workoutProfile: workout ? { types: workout.types, minutesMin: workout.minutesMin ? Number(workout.minutesMin) : null, minutesMax: workout.minutesMax ? Number(workout.minutesMax) : null, notes: workout.notes || null } : null,
    dietRestrictions: form.dietRestrictions ? {
      avoid: form.dietRestrictions.avoid ?? [], suitable: form.dietRestrictions.suitable ?? [], source: form.dietRestrictions.source || null,
      since: form.dietRestrictions.since || null, expectedDuration: form.dietRestrictions.expectedDuration || null,
      reviewOn: form.dietRestrictions.reviewOn || null, active: form.dietRestrictions.active !== false, notes: form.dietRestrictions.notes || null,
    } : null,
  };
}
