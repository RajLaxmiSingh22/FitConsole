import { useState } from "react";
import { Avatar, Button, Card, EmptyState, Field, Notice, PageHeader } from "../../components/ui/index.js";
import { courseCover } from "../../constants/media.js";
import CourseEditPanel from "./CourseEditPanel.jsx";
import { durations } from "../../constants/memberships.js";
import { apiCalls, getApiError } from "../../services/api.js";
import { currency } from "../../utils/format.js";

// Per-field price problems: each price > 0, and no longer plan cheaper than the one before it.
function planErrors(values) {
  const errors = {};
  let previous = null;
  for (const { months, label } of durations) {
    const raw = values[months];
    if (raw === "" || raw == null) continue;
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) { errors[months] = "Must be greater than 0."; continue; }
    if (previous && price < previous.price) errors[months] = `Must be at least the ${previous.label} price.`;
    previous = { price, label };
  }
  return errors;
}

export default function CourseCatalog({ courses, trainers, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("combat");
  const [description, setDescription] = useState("");
  const emptyPrices = () => Object.fromEntries(durations.map(({ months }) => [months, ""]));
  const [prices, setPrices] = useState(emptyPrices);
  const [priceErrors, setPriceErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [editingPrices, setEditingPrices] = useState("");
  const [coursePrices, setCoursePrices] = useState({});
  const [pricingError, setPricingError] = useState("");
  const [savingPrices, setSavingPrices] = useState(false);
  async function createCourse(event) {
    event.preventDefault();
    if (saving) return;
    const fieldErrors = planErrors(prices);
    setPriceErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    setSaving(true);
    setError("");
    try {
      const plans = durations.filter(({ months }) => prices[months] !== "").map(({ months }) => ({ durationMonths: months, price: Number(prices[months]) }));
      await apiCalls.courses.create({ name, category, description, plans });
      setShowForm(false);
      setName("");
      setDescription("");
      setPrices(emptyPrices());
      refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to create course."));
    } finally {
      setSaving(false);
    }
  }
  async function deactivate(course) {
    if (!window.confirm(`Deactivate ${course.name}?`)) return;
    try {
      await apiCalls.courses.deactivate(course.id);
      refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to deactivate course."));
    }
  }
  function startPriceEdit(course) {
    setPricingError("");
    setEditingPrices(course.id);
    setPriceErrors({});
    setCoursePrices(Object.fromEntries(durations.map(({ months }) => [
      months,
      course.CoursePlans?.find((plan) => Number(plan.durationMonths) === months)?.price ?? "",
    ])));
  }
  async function saveCoursePrices(course) {
    const plans = durations
      .filter(({ months }) => coursePrices[months] !== "")
      .map(({ months }) => ({ durationMonths: months, price: Number(coursePrices[months]) }));
    const fieldErrors = planErrors(coursePrices);
    setPriceErrors(fieldErrors);
    if (!plans.length) { setPricingError("Enter a price for at least one duration."); return; }
    if (Object.keys(fieldErrors).length) { setPricingError(""); return; }
    setSavingPrices(true);
    setPricingError("");
    try {
      await apiCalls.courses.update(course.id, { plans });
      setEditingPrices("");
      refresh();
    } catch (requestError) {
      setPricingError(getApiError(requestError, "Unable to update course pricing."));
    } finally {
      setSavingPrices(false);
    }
  }
  return (
    <>
      <PageHeader eyebrow={`${courses.length} active courses`} title="Courses & pricing" description="Create member offers, set prices for each membership duration, and manage teaching staff. Active offers appear in the client Membership workspace." actions={<Button onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "＋ New course"}</Button>} />
      <Notice error={error} />
      <Notice error={pricingError} />
      {showForm && <Card title="Create course" eyebrow="Course setup"><form className="form-grid" onSubmit={createCourse}>
        <Field label="Course name *"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Category *"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="combat">Combat</option><option value="strength">Strength</option><option value="conditioning">Conditioning</option><option value="wellness">Wellness</option><option value="combo">Combo</option></select></Field>
        <Field label="Description"><input value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        {durations.map(({ months, label }) => <Field label={`${label} price (₹)${months === 1 ? " *" : ""}`} key={months}><input type="number" min="1" step="0.01" required={months === 1} value={prices[months] ?? ""} aria-invalid={Boolean(priceErrors[months])} onChange={(event) => setPrices({ ...prices, [months]: event.target.value })} />{priceErrors[months] && <small className="field-error">{priceErrors[months]}</small>}</Field>)}
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save course"}</Button></div>
      </form></Card>}
      {courses.length ? <div className="course-grid">{courses.map((course) => {
        const cover = courseCover(course, 800);
        const coaches = course.Trainers ?? [];
        return <Card key={course.id} className="course-card course-card--cover">
          <div className="course-cover">
            <img src={cover.src} alt={cover.alt} loading="lazy" />
            <span className="course-cover-tag">{course.category}</span>
            {cover.isDefault && <span className="course-cover-default">Default cover</span>}
            <button type="button" className="course-cover-button" onClick={() => setEditing(course)}>⤒ {cover.isDefault ? "Upload cover" : "Change cover"}</button>
          </div>
          <div className="course-card-body">
            <h2>{course.name}</h2><p className="muted">{course.description || "Membership program"}</p>
            <div className="price-grid">{durations.map(({ months, label }) => { const plan = course.CoursePlans?.find((item) => Number(item.durationMonths) === months); return <div key={months}><small>{label}</small><b>{plan ? currency(plan.price) : "—"}</b></div>; })}</div>
            {editingPrices === course.id ? <div className="form-grid">
              {durations.map(({ months, label }) => <Field key={months} label={`${label} price (₹)`}><input type="number" min="0.01" step="0.01" value={coursePrices[months] ?? ""} aria-invalid={Boolean(priceErrors[months])} onChange={(event) => setCoursePrices({ ...coursePrices, [months]: event.target.value })} />{priceErrors[months] && <small className="field-error">{priceErrors[months]}</small>}</Field>)}
              <div className="form-actions"><Button onClick={() => saveCoursePrices(course)} disabled={savingPrices}>{savingPrices ? "Saving…" : "Publish offers"}</Button><Button variant="outline" onClick={() => setEditingPrices("")}>Cancel</Button></div>
            </div> : null}
            <div className="course-card-foot">
              <div className="avatar-stack" aria-label={coaches.length ? `Coaches: ${coaches.map((trainer) => trainer.User?.fullName).join(", ")}` : "No coaches assigned"}>
                {coaches.slice(0, 4).map((trainer) => <Avatar key={trainer.userId} userId={trainer.userId} name={trainer.User?.fullName ?? "?"} className="avatar avatar--stack" />)}
                {coaches.length > 4 && <span className="avatar avatar--stack avatar-more">+{coaches.length - 4}</span>}
                {!coaches.length && <small className="muted">No coaches yet</small>}
              </div>
              <div className="course-card-actions">
                {editingPrices !== course.id && <Button variant="ghost" onClick={() => startPriceEdit(course)}>Edit prices</Button>}
                <Button variant="outline" onClick={() => setEditing(course)}>Edit course</Button>
              </div>
            </div>
            <button className="text-button danger-text course-deactivate" onClick={() => deactivate(course)}>Deactivate course</button>
          </div>
        </Card>;
      })}</div> : <EmptyState title="No courses yet" detail="Add courses and membership prices to start enrolling members." />}
      {editing && <CourseEditPanel course={editing} trainers={trainers} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </>
  );
}
