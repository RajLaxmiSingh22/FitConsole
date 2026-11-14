import { useRef, useState } from "react";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { Avatar, Button, Card, Notice } from "../ui/index.js";

const SIZE = 320;

// Centre-crops to a square and re-encodes as JPEG, so uploads stay small whatever the camera produced.
async function squareJpeg(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext("2d").drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

export default function ProfilePhotoCard({ user, version, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run(action, done) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      onChange(responseData(await action()));
      setMessage(done);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update your photo."));
    } finally {
      setBusy(false);
    }
  }

  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file (JPEG, PNG or WebP).");
    let blob;
    try { blob = await squareJpeg(file); } catch { return setError("That image could not be read. Try a JPEG or PNG."); }
    run(() => apiCalls.profile.uploadAvatar(blob), "Photo updated.");
  }

  return <Card title="Profile photo" eyebrow="Shown in the app and on coach profiles">
    <div className="profile-photo">
      <Avatar userId={user.id} name={user.fullName} version={version} className="avatar avatar--xl" />
      <div className="profile-photo-actions">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
        <Button onClick={() => input.current?.click()} disabled={busy}>{busy ? "Saving…" : version ? "Change photo" : "Upload photo"}</Button>
        {version && <Button variant="ghost" onClick={() => run(() => apiCalls.profile.removeAvatar(), "Photo removed.")} disabled={busy}>Remove</Button>}
        <small className="muted">Square-cropped and resized to {SIZE}px. JPEG, PNG or WebP.</small>
      </div>
    </div>
    <Notice error={error} />{message && <Notice tone="success" error={message} />}
  </Card>;
}
