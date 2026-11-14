import { useRef, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm";
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 100 * 1024 * 1024;

function GalleryRow({ item, first, last, busy, onAction }) {
  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.caption ?? "");
  const dirty = title.trim() !== item.title || caption.trim() !== (item.caption ?? "");
  return <li className="gallery-admin-row">
    <div className="gallery-admin-thumb">
      {item.mediaType === "video"
        ? <video src={item.url} poster={item.posterUrl ?? undefined} muted preload="none" />
        : <img src={item.url} alt="" loading="lazy" />}
      <span className="gallery-admin-kind">{item.mediaType === "video" ? "▶ Video" : "Photo"}</span>
    </div>
    <div className="gallery-admin-fields">
      <Field label="Title"><input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label="Caption"><input value={caption} maxLength={160} onChange={(event) => setCaption(event.target.value)} /></Field>
      <div className="gallery-admin-actions">
        <StatusPill tone={item.isPublished ? "success" : "neutral"}>{item.isPublished ? "✓ Shown on website" : "Hidden"}</StatusPill>
        {dirty && <Button disabled={busy || title.trim().length < 2} onClick={() => onAction(() => apiCalls.gallery.update(item.id, { title, caption }), "Saved.")}>Save</Button>}
        <Button variant="outline" disabled={busy} onClick={() => onAction(() => apiCalls.gallery.update(item.id, { isPublished: !item.isPublished }), item.isPublished ? "Hidden from the website." : "Shown on the website.")}>{item.isPublished ? "Hide" : "Show"}</Button>
        <Button variant="ghost" disabled={busy || first} aria-label="Move up" onClick={() => onAction("up")}>↑</Button>
        <Button variant="ghost" disabled={busy || last} aria-label="Move down" onClick={() => onAction("down")}>↓</Button>
        <Button variant="ghost" disabled={busy} onClick={() => window.confirm(`Delete "${item.title}"? This removes the file from storage.`) && onAction(() => apiCalls.gallery.remove(item.id), "Deleted.")}>Delete</Button>
      </div>
    </div>
  </li>;
}

export default function GalleryManager() {
  const gallery = useLoad(async () => responseData(await apiCalls.gallery.list()), []);
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const items = gallery.data?.items ?? [];

  async function run(action, done) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(done);
      await gallery.refresh();
      return true;
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update the gallery."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function pick(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    setError("");
    if (!chosen) return;
    const isVideo = chosen.type.startsWith("video/");
    if (!ACCEPT.split(",").includes(chosen.type)) return setError("Choose a JPEG, PNG or WebP photo, or an MP4, MOV or WebM video.");
    if (chosen.size > (isVideo ? VIDEO_MAX : IMAGE_MAX)) return setError(isVideo ? "Videos can be up to 100 MB." : "Photos can be up to 10 MB.");
    setFile(chosen);
    if (!title) setTitle(chosen.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 80));
  }

  async function upload(event) {
    event.preventDefault();
    const ok = await run(() => apiCalls.gallery.upload(file, { title: title.trim(), caption: caption.trim(), published }), "Uploaded.");
    if (ok) { setFile(null); setTitle(""); setCaption(""); }
  }

  function move(index, direction) {
    const ids = items.map((item) => item.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return run(() => apiCalls.gallery.reorder(ids), "Order updated.");
  }

  if (gallery.loading && !gallery.data) return <LoadingState />;
  const storageReady = gallery.data?.storageConfigured;

  return <>
    <PageHeader eyebrow="Website" title="Gallery" description="Photos and videos shown on the public Gallery page. Files are stored in Cloudinary; hidden items stay saved but are not shown." />
    <Notice error={gallery.error} />
    {gallery.data && !storageReady && <Notice error="Media storage is not configured. Add the CLOUDINARY_* settings to Backend/.env to enable uploads." />}
    <Card title="Add to gallery" eyebrow="Photo up to 10 MB · video up to 100 MB">
      <form className="gallery-upload" onSubmit={upload}>
        <input ref={input} type="file" accept={ACCEPT} hidden onChange={pick} />
        <div className="gallery-upload-file">
          <Button type="button" variant="outline" disabled={busy || !storageReady} onClick={() => input.current?.click()}>{file ? "Choose another file" : "Choose photo or video"}</Button>
          <small className="muted">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "No file chosen"}</small>
        </div>
        <Field label="Title *"><input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} required minLength={2} /></Field>
        <Field label="Caption"><input value={caption} maxLength={160} onChange={(event) => setCaption(event.target.value)} /></Field>
        <label className="gallery-upload-check"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Show on the website right away</label>
        <Button type="submit" disabled={busy || !file || title.trim().length < 2 || !storageReady}>{busy && file ? "Uploading…" : "Upload"}</Button>
      </form>
    </Card>
    <Notice error={error} />{message && <Notice tone="success" error={message} />}
    <Card title="Gallery items" eyebrow={`${items.filter((item) => item.isPublished).length} shown · ${items.length} total`}>
      {items.length === 0
        ? <EmptyState title="No photos or videos yet" detail="Until you add some, the website shows placeholder tiles." />
        : <ol className="gallery-admin-list">{items.map((item, index) => <GalleryRow
          key={`${item.id}-${item.updatedAt}`}
          item={item}
          first={index === 0}
          last={index === items.length - 1}
          busy={busy}
          onAction={(action, done) => (action === "up" ? move(index, -1) : action === "down" ? move(index, 1) : run(action, done))}
        />)}</ol>}
    </Card>
  </>;
}
