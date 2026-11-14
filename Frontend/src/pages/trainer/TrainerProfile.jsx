import CoachDetailsForm from "../../components/profile/CoachDetailsForm.jsx";
import ProfilePhotoCard from "../../components/profile/ProfilePhotoCard.jsx";
import { Card, Field, PageHeader } from "../../components/ui/index.js";
import { useProfile } from "../../hooks/useProfile.js";
import { apiCalls } from "../../services/api.js";

export default function TrainerProfile({ user }) {
  const { profile, applyProfile } = useProfile();
  return <>
    <PageHeader eyebrow="Coach profile" title={user.fullName} description="Keep your public-facing trainer profile current." />
    <div className="dashboard-grid">
      <ProfilePhotoCard user={user} version={profile?.avatarVersion} onChange={applyProfile} />
      <Card title="Account" eyebrow="Sign-in details">
        <div className="form-grid"><Field label="Name"><input value={user.fullName} disabled /></Field><Field label="Email"><input value={user.email} disabled /></Field></div>
      </Card>
    </div>
    <Card title="Trainer details"><CoachDetailsForm userId={user.id} save={(changes) => apiCalls.trainers.updateMe(changes)} /></Card>
  </>;
}
