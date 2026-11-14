import { useEffect, useState } from "react";
import CoachDetailsForm from "../../components/profile/CoachDetailsForm.jsx";
import ProfilePhotoCard from "../../components/profile/ProfilePhotoCard.jsx";
import { Button, Card, Field, LoadingState, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { useProfile } from "../../hooks/useProfile.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

export default function OwnerProfile({ onCoachingChange }) {
  const { profile, error: loadError, applyProfile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (profile) setFullName(profile.user.fullName); }, [profile?.user.fullName]);

  async function run(key, action, done) {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      applyProfile(responseData(await action()));
      setMessage(done);
      return true;
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save your profile."));
      return false;
    } finally {
      setBusy("");
    }
  }

  if (!profile) return loadError ? <Notice error={loadError} /> : <LoadingState label="Loading your profile…" />;
  const { user, coaching } = profile;
  async function toggleCoaching() {
    if (await run("coaching", () => apiCalls.profile.setCoaching(!coaching), coaching ? "You're no longer listed as a coach." : "Coach profile created. You now appear under Trainers and can be assigned members.")) onCoachingChange?.();
  }

  return <>
    <PageHeader eyebrow="Account settings" title="Your profile" description="Your photo and name, plus a coach profile if you also train members." />
    <Notice error={error} />{message && <Notice tone="success" error={message} />}
    <div className="dashboard-grid">
      <ProfilePhotoCard user={user} version={profile.avatarVersion} onChange={applyProfile} />
      <Card title="Account" eyebrow="Gym owner">
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); run("name", () => apiCalls.profile.update({ fullName }), "Name saved."); }}>
          <Field label="Full name *"><input required minLength="2" maxLength="120" value={fullName} onChange={(event) => setFullName(event.target.value)} /></Field>
          <Field label="Email"><input value={user.email} disabled /></Field>
          <div className="form-actions"><Button type="submit" disabled={busy === "name" || fullName.trim() === user.fullName}>{busy === "name" ? "Saving…" : "Save name"}</Button></div>
        </form>
      </Card>
    </div>
    <Card title="Coaching" eyebrow={coaching ? "You coach members" : "Not coaching"} action={<StatusPill tone={coaching ? "success" : "neutral"}>{coaching ? "✓ Listed as coach" : "Owner only"}</StatusPill>}>
      <label className="checkbox-field profile-coaching-toggle">
        <input type="checkbox" checked={coaching} disabled={busy === "coaching"} onChange={toggleCoaching} />
        <span><b>I also coach members</b><small>Adds you to the coaching team: members, courses and classes can be assigned to you, and your coach profile appears on the website.</small></span>
      </label>
      {coaching && <CoachDetailsForm userId={user.id} save={(changes) => apiCalls.trainers.update(user.id, changes)} />}
    </Card>
  </>;
}
