const days = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [7, "Sun"]];

// Planned training weekdays; streaks and attendance % are measured against these.
export default function TrainingDaysPicker({ value, onChange }) {
  const selected = value?.length ? value : [1, 3, 5];
  const toggle = (day) => {
    const next = selected.includes(day) ? selected.filter((item) => item !== day) : [...selected, day].sort();
    if (next.length) onChange(next);
  };
  return <fieldset className="diet-allergies field--wide training-days">
    <legend>Training days (your streak counts these)</legend>
    {days.map(([day, label]) => <label key={day} className={`diet-chip ${selected.includes(day) ? "is-on" : ""}`}>
      <input type="checkbox" checked={selected.includes(day)} onChange={() => toggle(day)} />{label}
    </label>)}
  </fieldset>;
}
