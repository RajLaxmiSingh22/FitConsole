import { useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { openingHoursSummary, withinOpeningHours } from "../../constants/openingHours.js";
import { classLevels, timeLabel, weekdays } from "../../constants/schedule.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

const emptyForm = { id: "", courseId: "", trainerId: "", weekday: "1", startTime: "06:00", endTime: "07:00", level: "All levels" };

// Owner: the weekly class timetable shown on the public Schedule page.
export default function ClassSchedule({ courses, trainers, embedded = false }) {
  const schedule = useLoad(async () => responseData(await apiCalls.schedule.manage()));
  const sessions = schedule.data ?? [];
  const activeCourses = courses.filter((course) => course.active !== false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editing = Boolean(form.id);
  const set = (changes) => setForm((current) => ({ ...current, ...changes }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      courseId: form.courseId,
      trainerId: form.trainerId || null,
      weekday: Number(form.weekday),
      startTime: form.startTime,
      endTime: form.endTime,
      level: form.level || null,
    };
    try {
      if (editing) await apiCalls.schedule.update(form.id, payload);
      else await apiCalls.schedule.create(payload);
      setNotice(editing ? "Class updated." : "Class added to the timetable.");
      // Keep course, trainer and times so similar classes on other days are quick to add.
      setForm((current) => ({ ...current, id: "" }));
      schedule.refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save this class."));
    } finally {
      setSaving(false);
    }
  }

  async function change(session, request, message) {
    setError("");
    setNotice("");
    try {
      await request();
      setNotice(message);
      if (form.id === session.id) setForm(emptyForm);
      schedule.refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update this class."));
    }
  }

  function startEdit(session) {
    setForm({
      id: session.id,
      courseId: session.course?.id ?? "",
      trainerId: session.trainer?.id ?? "",
      weekday: String(session.weekday),
      startTime: session.startTime,
      endTime: session.endTime,
      level: session.level ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <>
    {embedded
      ? <div className="desk-schedule-intro"><p className="muted">Classes you add here appear on the public <b>Schedule</b> page and as quick picks on the Check-in tab.</p><a className="button button--outline" href="/schedule" target="_blank" rel="noopener noreferrer">View public page ↗</a></div>
      : <PageHeader eyebrow="Website" title="Class schedule" description="Your weekly timetable. Active classes appear on the public Schedule page." actions={<a className="button button--outline" href="/schedule" target="_blank" rel="noopener noreferrer">View public page ↗</a>} />}
    <Notice error={error || schedule.error} />
    <Notice tone="success" error={notice} />

    <Card title={editing ? "Edit class" : "Add a class"} eyebrow="Timetable slot">
      {activeCourses.length ? <form className="form-grid schedule-form" onSubmit={save}>
        <Field label="Course"><select required value={form.courseId} onChange={(event) => set({ courseId: event.target.value })}>
          <option value="">Choose a course</option>
          {activeCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select></Field>
        <Field label="Trainer"><select value={form.trainerId} onChange={(event) => set({ trainerId: event.target.value })}>
          <option value="">No trainer listed</option>
          {trainers.map((trainer) => <option key={trainer.userId} value={trainer.userId}>{trainer.User?.fullName ?? "Trainer"}</option>)}
        </select></Field>
        <Field label="Day"><select value={form.weekday} onChange={(event) => set({ weekday: event.target.value })}>
          {weekdays.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select></Field>
        <Field label="Level"><select value={form.level} onChange={(event) => set({ level: event.target.value })}>
          <option value="">Not shown</option>
          {classLevels.map((level) => <option key={level} value={level}>{level}</option>)}
        </select></Field>
        <Field label="Starts"><input type="time" required step="300" value={form.startTime} onChange={(event) => set({ startTime: event.target.value })} /></Field>
        <Field label="Ends"><input type="time" required step="300" value={form.endTime} onChange={(event) => set({ endTime: event.target.value })} /></Field>
        {!withinOpeningHours(Number(form.weekday), form.startTime, form.endTime) && <p className="mship-hint field--wide" role="status">
          This class is outside opening hours ({openingHoursSummary.map(([days, hours]) => `${days} ${hours}`).join(" · ")}). You can still save it.
        </p>}
        <div className="form-actions">
          {editing && <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>Cancel edit</Button>}
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add class"}</Button>
        </div>
      </form> : <EmptyState title="Add a course first" detail="Classes belong to a course. Create one under Courses, then add its times here." />}
    </Card>

    <Card title="This week" eyebrow={`${sessions.filter((session) => session.active).length} active classes`}>
      {schedule.loading && !schedule.data ? <LoadingState label="Loading timetable…" />
        : sessions.length ? <div className="schedule-admin">{weekdays.map(([value, name]) => {
          const day = sessions.filter((session) => session.weekday === value);
          if (!day.length) return null;
          return <section key={value} className="schedule-admin-day">
            <h3>{name}</h3>
            {day.map((session) => <article key={session.id} className={`schedule-admin-row ${session.active ? "" : "is-paused"}`}>
              <span className="schedule-time">{timeLabel(session.startTime)} – {timeLabel(session.endTime)}</span>
              <span><b>{session.course?.name ?? "Course"}</b><small>{session.trainer?.name ?? "No trainer listed"}{session.level ? ` · ${session.level}` : ""}</small></span>
              <StatusPill tone={session.active ? "success" : "neutral"}>{session.active ? "Shown" : "Paused"}</StatusPill>
              <div className="row-actions">
                <Button variant="outline" onClick={() => startEdit(session)}>Edit</Button>
                <Button variant="ghost" onClick={() => change(session, () => apiCalls.schedule.update(session.id, { active: !session.active }), session.active ? "Class paused; it is hidden from the website." : "Class is back on the timetable.")}>{session.active ? "Pause" : "Resume"}</Button>
                <Button variant="ghost" onClick={() => { if (window.confirm(`Remove ${session.course?.name ?? "this class"} on ${name}?`)) change(session, () => apiCalls.schedule.remove(session.id), "Class removed."); }}>Remove</Button>
              </div>
            </article>)}
          </section>;
        })}</div>
          : <EmptyState title="No classes yet" detail="Add your first class above. It will appear on the public Schedule page straight away." />}
    </Card>
  </>;
}
