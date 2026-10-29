import { useEffect, useState } from "react";
import { Button, Card, Field, Notice, PageHeader } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

export default function TrainerProfile({ user }) {
  const [profile, setProfile] = useState({ phone: "", certification: "", experienceYears: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    apiCalls.trainers.get(user.id).then((response) => {
      const trainer = responseData(response);
      setProfile({ phone: trainer.phone ?? "", certification: trainer.certification ?? "", experienceYears: trainer.experienceYears ?? "" });
    }).catch((requestError) => setError(getApiError(requestError)));
  }, [user.id]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiCalls.trainers.updateMe({ ...profile, experienceYears: profile.experienceYears === "" ? null : Number(profile.experienceYears) });
      setMessage("Trainer profile saved.");
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save profile."));
    } finally {
      setSaving(false);
    }
  }
  return <>
    <PageHeader eyebrow="Coach profile" title={user.fullName} description="Keep your public-facing trainer profile current." />
    <Notice error={error} /><Notice error={message} />
    <Card title="Trainer details"><form className="form-grid" onSubmit={save}>
      <Field label="Name"><input value={user.fullName} disabled /></Field>
      <Field label="Email"><input value={user.email} disabled /></Field>
      <Field label="Phone"><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></Field>
      <Field label="Certification"><input value={profile.certification} onChange={(event) => setProfile({ ...profile, certification: event.target.value })} /></Field>
      <Field label="Experience (years)"><input type="number" min="0" step="0.1" value={profile.experienceYears} onChange={(event) => setProfile({ ...profile, experienceYears: event.target.value })} /></Field>
      <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></div>
    </form></Card>
  </>;
}
