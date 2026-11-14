import { useEffect, useState } from "react";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { Button, Field, LoadingState, Notice } from "../ui/index.js";

// One entry per line → trimmed list, as the API expects.
function toList(text, max) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, max);
}

// Coach details shown to members and on the public website; `save` decides which endpoint receives them.
export default function CoachDetailsForm({ userId, save }) {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    apiCalls.trainers.get(userId).then((response) => {
      const trainer = responseData(response);
      setProfile({ phone: trainer.phone ?? "", certification: trainer.certification ?? "", experienceYears: trainer.experienceYears ?? "", bio: trainer.bio ?? "", achievements: (trainer.achievements ?? []).join("\n"), specialties: (trainer.specialties ?? []).join("\n") });
    }).catch((requestError) => setError(getApiError(requestError, "Unable to load coach details.")));
  }, [userId]);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await save({ ...profile, experienceYears: profile.experienceYears === "" ? null : Number(profile.experienceYears), achievements: toList(profile.achievements, 6), specialties: toList(profile.specialties, 6) });
      setMessage("Coach profile saved.");
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save profile."));
    } finally {
      setSaving(false);
    }
  }
  if (!profile) return error ? <Notice error={error} /> : <LoadingState label="Loading coach details…" />;
  const set = (key) => (event) => setProfile({ ...profile, [key]: event.target.value });
  return <form className="form-grid" onSubmit={submit}>
    <Field label="Phone"><input value={profile.phone} onChange={set("phone")} /></Field>
    <Field label="Certification"><input value={profile.certification} onChange={set("certification")} /></Field>
    <Field label="Experience (years)"><input type="number" min="0" step="0.1" value={profile.experienceYears} onChange={set("experienceYears")} /></Field>
    <Field label="Public bio (shown on the website)" className="field--wide"><textarea rows="3" maxLength="600" value={profile.bio} onChange={set("bio")} /></Field>
    <Field label="Achievements (one per line, up to 6)"><textarea rows="4" value={profile.achievements} onChange={set("achievements")} /></Field>
    <Field label="Specialties (one per line, up to 6)"><textarea rows="4" value={profile.specialties} onChange={set("specialties")} /></Field>
    <div className="form-actions field--wide"><Notice error={error} />{message && <Notice tone="success" error={message} />}<Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save coach profile"}</Button></div>
  </form>;
}
