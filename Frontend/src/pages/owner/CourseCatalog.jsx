import { useState } from "react";
import { Button, Card, EmptyState, Field, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { durations } from "../../constants/memberships.js";
import { apiCalls, getApiError } from "../../services/api.js";
import { currency } from "../../utils/format.js";

export default function CourseCatalog({ courses, trainers, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("combat");
  const [description, setDescription] = useState("");
  const [prices, setPrices] = useState({ 1: "", 3: "", 6: "", 12: "" });
  const [trainerSelection, setTrainerSelection] = useState({});
  const [editingPrices, setEditingPrices] = useState("");
  const [coursePrices, setCoursePrices] = useState({});
  const [pricingError, setPricingError] = useState("");
  const [savingPrices, setSavingPrices] = useState(false);
  async function createCourse(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const plans = durations.filter(({ months }) => prices[months] !== "").map(({ months }) => ({ durationMonths: months, price: Number(prices[months]) }));
      await apiCalls.courses.create({ name, category, description, plans });
      setShowForm(false);
      setName("");
      setPrices({ 1: "", 3: "", 6: "", 12: "" });
      refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to create course."));
    } finally {
      setSaving(false);
    }
  }
  async function toggleTrainer(course, trainerUserId, checked) {
    const oldIds = trainerSelection[course.id] ?? course.Trainers?.map((item) => item.userId) ?? [];
    const next = checked ? [...oldIds, trainerUserId] : oldIds.filter((id) => id !== trainerUserId);
    setTrainerSelection({ ...trainerSelection, [course.id]: next });
    try {
      await apiCalls.courses.setTrainers(course.id, next);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update teaching trainers."));
      setTrainerSelection({ ...trainerSelection, [course.id]: oldIds });
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
    setCoursePrices(Object.fromEntries(durations.map(({ months }) => [
      months,
      course.CoursePlans?.find((plan) => Number(plan.durationMonths) === months)?.price ?? "",
    ])));
  }
  async function saveCoursePrices(course) {
    const plans = durations
      .filter(({ months }) => coursePrices[months] !== "")
      .map(({ months }) => ({ durationMonths: months, price: Number(coursePrices[months]) }));
    if (!plans.length || plans.some((plan) => !Number.isFinite(plan.price) || plan.price <= 0)) {
      setPricingError("Enter a price greater than zero for at least one duration.");
      return;
    }
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
        {durations.map(({ months, label }) => <Field label={`${label} price (₹)${months === 1 ? " *" : ""}`} key={months}><input type="number" min="1" step="0.01" required={months === 1} value={prices[months]} onChange={(event) => setPrices({ ...prices, [months]: event.target.value })} /></Field>)}
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save course"}</Button></div>
      </form></Card>}
      {courses.length ? <div className="course-grid">{courses.map((course) => {
        const assigned = trainerSelection[course.id] ?? course.Trainers?.map((trainer) => trainer.userId) ?? [];
        return <Card key={course.id} className="course-card">
          <div className="course-top"><StatusPill tone="primary">{course.category}</StatusPill><button className="text-button danger-text" onClick={() => deactivate(course)}>Deactivate</button></div>
          <h2>{course.name}</h2><p className="muted">{course.description || "Membership program"}</p>
          <div className="price-grid">{durations.map(({ months, label }) => { const plan = course.CoursePlans?.find((item) => Number(item.durationMonths) === months); return <div key={months}><small>{label}</small><b>{plan ? currency(plan.price) : "—"}</b></div>; })}</div>
          {editingPrices === course.id ? <div className="form-grid">
            {durations.map(({ months, label }) => <Field key={months} label={`${label} price (₹)`}><input type="number" min="0.01" step="0.01" value={coursePrices[months] ?? ""} onChange={(event) => setCoursePrices({ ...coursePrices, [months]: event.target.value })} /></Field>)}
            <div className="form-actions"><Button onClick={() => saveCoursePrices(course)} disabled={savingPrices}>{savingPrices ? "Saving…" : "Publish offers"}</Button><Button variant="outline" onClick={() => setEditingPrices("")}>Cancel</Button></div>
          </div> : <Button variant="outline" onClick={() => startPriceEdit(course)}>Edit member offers</Button>}
          <div className="trainer-assignment"><p className="overline">Teaching trainers</p>{trainers.map((trainer) => <label key={trainer.userId}><input type="checkbox" checked={assigned.includes(trainer.userId)} onChange={(event) => toggleTrainer(course, trainer.userId, event.target.checked)} />{trainer.User?.fullName}</label>)}</div>
        </Card>;
      })}</div> : <EmptyState title="No courses yet" detail="Add courses and membership prices to start enrolling members." />}
    </>
  );
}
