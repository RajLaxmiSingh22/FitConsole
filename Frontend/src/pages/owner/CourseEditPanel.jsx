import { useEffect, useRef, useState } from "react";
import { Button, Field, Notice } from "../../components/ui/index.js";
import { courseCover, defaultCoverKeys, defaultCoverLabels, defaultCoverUrl } from "../../constants/media.js";
import { apiCalls, getApiError } from "../../services/api.js";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const CATEGORIES = [["combat", "Combat"], ["strength", "Strength"], ["conditioning", "Conditioning"], ["wellness", "Wellness"], ["combo", "Combo"]];

// Phone photos are often over 5 MB: shrink them to 1920px JPEG first (re-encoding also drops EXIF/GPS).
async function shrinkIfNeeded(file) {
  if (file.size <= MAX_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob || blob.size > MAX_BYTES) throw new Error("too-large");
  return new File([blob], "cover.jpg", { type: "image/jpeg" });
}

export default function CourseEditPanel({ course, trainers, onClose, onSaved }) {
  const input = useRef(null);
  const [category, setCategory] = useState(course.category);
  const [alt, setAlt] = useState(course.coverImageAlt ?? "");
  const [coverDefault, setCoverDefault] = useState(course.coverDefault ?? null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [removeUpload, setRemoveUpload] = useState(false);
  const [assigned, setAssigned] = useState(course.Trainers?.map((trainer) => trainer.userId) ?? []);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const hasUpload = Boolean(file) || (course.coverImageUrl && !removeUpload);
  const shown = file ? { src: preview, isDefault: false }
    : hasUpload ? courseCover(course, 1200)
    : courseCover({ ...course, category, coverImageUrl: null, coverDefault }, 0);

  async function choose(chosen) {
    setError("");
    if (!chosen) return;
    if (!TYPES.includes(chosen.type)) return setError("Choose a JPEG, PNG or WebP image.");
    try {
      const ready = await shrinkIfNeeded(chosen);
      setFile(ready);
      setPreview(URL.createObjectURL(ready));
      setRemoveUpload(false);
    } catch {
      setError("That image is too large (5 MB maximum) and could not be shrunk.");
    }
  }

  function pickDefault(key) {
    setCoverDefault(key);
    setFile(null);
    setPreview("");
    if (course.coverImageUrl) setRemoveUpload(true);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await apiCalls.courses.update(course.id, { category, coverImageAlt: alt.trim() || null, coverDefault });
      const before = course.Trainers?.map((trainer) => trainer.userId) ?? [];
      if (before.length !== assigned.length || before.some((id) => !assigned.includes(id))) await apiCalls.courses.setTrainers(course.id, assigned);
      if (file) await apiCalls.courses.uploadCover(course.id, file, alt.trim());
      else if (removeUpload) await apiCalls.courses.removeCover(course.id);
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save the course."));
    } finally {
      setBusy(false);
    }
  }

  return <div className="course-panel-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <aside className="course-panel" role="dialog" aria-modal="true" aria-labelledby="course-panel-title">
      <header><h2 id="course-panel-title">Edit course</h2><p className="muted">{course.name}</p></header>
      <div className="course-panel-body">
        <p className="overline">Cover image</p>
        <div className={`cover-drop ${dragging ? "is-dragging" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files?.[0]); }}>
          <div className="cover-drop-preview">
            <img src={shown.src} alt="" />
            <span className="cover-drop-ratio">16:9</span>
            {shown.isDefault && <span className="cover-drop-badge">Default cover</span>}
          </div>
          <div className="cover-drop-actions">
            <button type="button" className="cover-drop-pick" onClick={() => input.current?.click()} disabled={busy}>
              <b>Drop a photo or click to upload</b>
              <small>JPEG, PNG or WebP · max 5 MB · at least 1200×675</small>
            </button>
            {hasUpload && <Button type="button" variant="outline" disabled={busy} onClick={() => { setFile(null); setPreview(""); setRemoveUpload(Boolean(course.coverImageUrl)); }}>Remove</Button>}
          </div>
          <input ref={input} type="file" accept={TYPES.join(",")} hidden onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
        </div>

        <p className="cover-defaults-label">Or use a default cover:</p>
        <div className="cover-defaults" role="radiogroup" aria-label="Default covers">
          {defaultCoverKeys.map((key) => {
            const selected = !hasUpload && shown.key === key;
            return <button key={key} type="button" role="radio" aria-checked={selected} className={selected ? "is-selected" : ""} onClick={() => pickDefault(key)} disabled={busy}>
              <img src={defaultCoverUrl(key)} alt="" loading="lazy" /><span>{defaultCoverLabels[key]}</span>
            </button>;
          })}
        </div>

        <Field label="Image description (for screen readers)"><input value={alt} maxLength={200} placeholder="e.g. Boxer hitting pads with a coach" onChange={(event) => setAlt(event.target.value)} /></Field>
        <Field label="Category"><select value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.some(([value]) => value === category) ? null : <option value={category}>{category}</option>}
          {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></Field>

        <fieldset className="course-panel-trainers">
          <legend className="overline">Teaching trainers</legend>
          {trainers.length ? trainers.map((trainer) => <label key={trainer.userId}>
            <input type="checkbox" checked={assigned.includes(trainer.userId)} onChange={(event) => setAssigned(event.target.checked ? [...assigned, trainer.userId] : assigned.filter((id) => id !== trainer.userId))} />
            {trainer.User?.fullName}
          </label>) : <p className="muted">No trainers yet.</p>}
        </fieldset>
        <Notice error={error} />
      </div>
      <footer><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save course"}</Button></footer>
    </aside>
  </div>;
}
