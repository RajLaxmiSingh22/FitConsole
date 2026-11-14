import { createHash, randomUUID } from "node:crypto";

// Signed Cloudinary uploads over the REST API. Credentials stay on the server.
//
// Folder layout (under CLOUDINARY_ROOT_FOLDER, default "fitconsole"):
//   <root>/users/avatars/<owner|trainer|client>/<userId>/<random>   profile photos
//   <root>/gallery/images/<random>                                   gallery photos
//   <root>/gallery/videos/<random>                                   gallery videos
//   <root>/courses/<courseId>/<random>                               course covers (1200x675 WebP)
// Gallery files and course covers are uploaded by the browser directly to Cloudinary with a signature
// from this server (see signDirectUpload / verifyDirectUpload below).
//   <root>/site/...                                                  site design assets

const ROLE_FOLDERS = new Set(["owner", "trainer", "client"]);

export function cloudinaryConfig(env = process.env) {
  // Accepts the dashboard's CLOUDINARY_URL (cloudinary://key:secret@cloud) or the three separate values.
  let fromUrl = {};
  try {
    const parsed = env.CLOUDINARY_URL?.trim() ? new URL(env.CLOUDINARY_URL.trim()) : null;
    if (parsed?.protocol === "cloudinary:") {
      fromUrl = { cloudName: parsed.hostname, apiKey: decodeURIComponent(parsed.username), apiSecret: decodeURIComponent(parsed.password) };
    }
  } catch {
    // A malformed URL is treated as not configured.
  }
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim() || fromUrl.cloudName;
  const apiKey = env.CLOUDINARY_API_KEY?.trim() || fromUrl.apiKey;
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim() || fromUrl.apiSecret;
  if (!cloudName || !apiKey || !apiSecret) return null;
  const root = (env.CLOUDINARY_ROOT_FOLDER?.trim() || "fitconsole").replace(/^\/+|\/+$/g, "");
  return { cloudName, apiKey, apiSecret, root };
}

export const isCloudinaryConfigured = () => Boolean(cloudinaryConfig());

export function avatarFolder(root, role, userId) {
  return `${root}/users/avatars/${ROLE_FOLDERS.has(role) ? role : "other"}/${userId}`;
}

export function galleryFolder(root, mediaType) {
  return `${root}/gallery/${mediaType === "video" ? "videos" : "images"}`;
}

// Cloudinary signature: alphabetically sorted "key=value" pairs joined by "&", then the secret, SHA-1.
export function signParams(params, apiSecret) {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + apiSecret).digest("hex");
}

async function callCloudinary(config, resourceType, action, params, file) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { ...params, timestamp };
  const form = new FormData();
  for (const [key, value] of Object.entries(signed)) form.append(key, String(value));
  form.append("api_key", config.apiKey);
  form.append("signature", signParams(signed, config.apiSecret));
  if (file) form.append("file", new Blob([file.buffer], { type: file.mimeType }));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/${action}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(file && resourceType === "video" ? 300_000 : 60_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(`Cloudinary ${action} failed (${response.status}): ${body.error?.message ?? "no details"}`);
  }
  return body;
}

function requireConfig() {
  const config = cloudinaryConfig();
  if (!config) throw Object.assign(new Error("Cloudinary is not configured."), { code: "CLOUDINARY_NOT_CONFIGURED" });
  return config;
}

export async function uploadAvatarImage({ buffer, mimeType, role, userId }) {
  const config = requireConfig();
  const result = await callCloudinary(config, "image", "upload", {
    folder: avatarFolder(config.root, role, userId),
    public_id: randomUUID(),
    overwrite: "false",
  }, { buffer, mimeType });
  return { publicId: result.public_id, url: result.secure_url };
}

// ---------- Direct browser uploads (gallery and course covers) ----------
// The server signs one upload for one exact folder + random public_id; the browser sends the file straight
// to Cloudinary, so large files never pass through the API. Afterwards the server looks the asset up in
// our own Cloudinary account and checks folder, type, format and size before saving anything.

export const DIRECT_UPLOAD_KINDS = {
  "gallery-image": { resourceType: "image", formats: ["jpg", "png", "webp"], maxBytes: 10 * 1024 * 1024 },
  "gallery-video": { resourceType: "video", formats: ["mp4", "mov", "webm"], maxBytes: 100 * 1024 * 1024 },
  // Covers are cropped to 16:9 and stored as WebP on upload; re-encoding also drops EXIF/GPS metadata.
  // f_webp must sit inside the transformation: Cloudinary ignores `format` when allowed_formats is set.
  "course-cover": { resourceType: "image", formats: ["jpg", "png", "webp"], maxBytes: 5 * 1024 * 1024, transformation: "c_fill,g_auto,w_1200,h_675,f_webp", format: "webp" },
};

export function directUploadFolder(root, kind, courseId) {
  if (kind === "course-cover") return `${root}/courses/${courseId}`;
  return galleryFolder(root, kind === "gallery-video" ? "video" : "image");
}

// Parameters the browser posts to Cloudinary together with the file. Everything except the file is signed.
export function signDirectUpload({ kind, courseId }, { config = requireConfig(), now = Date.now() } = {}) {
  const spec = DIRECT_UPLOAD_KINDS[kind];
  if (!spec) throw new Error(`Unknown upload kind ${kind}`);
  const folder = directUploadFolder(config.root, kind, courseId);
  const params = {
    folder,
    public_id: randomUUID(),
    overwrite: "false",
    allowed_formats: spec.formats.join(","),
    timestamp: Math.floor(now / 1000),
    ...(spec.transformation ? { transformation: spec.transformation } : {}),
    ...(spec.format ? { format: spec.format } : {}),
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${spec.resourceType}/upload`,
    fields: { ...params, api_key: config.apiKey, signature: signParams(params, config.apiSecret) },
    publicIdPrefix: `${folder}/`,
    maxBytes: spec.maxBytes,
  };
}

// Admin API lookup in our own account; null when the asset does not exist.
export async function fetchAsset(publicId, resourceType, { config = requireConfig(), fetchImpl = fetch } = {}) {
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/${resourceType}/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(`Cloudinary lookup failed (${response.status}): ${body.error?.message ?? "no details"}`);
  return body;
}

// Checks an asset the browser says it uploaded. Returns { asset } or { error }; on a bad asset that does
// exist in our folder, the caller should delete it.
export async function verifyDirectUpload({ kind, courseId, publicId }, { config = requireConfig(), fetchImpl = fetch } = {}) {
  const spec = DIRECT_UPLOAD_KINDS[kind];
  const folder = directUploadFolder(config.root, kind, courseId);
  const name = typeof publicId === "string" && publicId.startsWith(`${folder}/`) ? publicId.slice(folder.length + 1) : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(name)) {
    return { error: "That upload does not belong to this gallery or course.", status: 400 };
  }
  const asset = await fetchAsset(publicId, spec.resourceType, { config, fetchImpl });
  if (!asset) return { error: "The uploaded file was not found. Upload it again.", status: 400 };
  if (asset.public_id !== publicId || asset.resource_type !== spec.resourceType || asset.type !== "upload") {
    return { error: "That upload does not belong to this gallery or course.", status: 400, remove: true };
  }
  // When a format is required (covers), it proves the crop/re-encode ran; otherwise the upload's own format must be allowed.
  const format = String(asset.format).toLowerCase();
  if (spec.format ? format !== spec.format : !spec.formats.includes(format)) {
    return { error: "Upload a supported file type.", status: 400, remove: true };
  }
  if (!(asset.bytes > 0) || asset.bytes > spec.maxBytes) {
    return { error: `The file is too large (${Math.round(spec.maxBytes / 1024 / 1024)} MB maximum).`, status: 413, remove: true };
  }
  return {
    asset: {
      publicId: asset.public_id,
      url: asset.secure_url,
      // Cloudinary renders a still frame for any video when the extension is swapped to .jpg.
      posterUrl: spec.resourceType === "video" ? asset.secure_url.replace(/\.[a-z0-9]+$/i, ".jpg") : null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      bytes: asset.bytes ?? null,
    },
  };
}

export async function destroyMedia(publicId, resourceType = "image") {
  const config = requireConfig();
  return callCloudinary(config, resourceType, "destroy", { public_id: publicId, invalidate: "true" });
}

// Deletes without failing the caller; an orphaned file is logged rather than blocking the user.
export async function destroyMediaQuietly(publicId, resourceType = "image") {
  if (!publicId) return;
  try {
    await destroyMedia(publicId, resourceType);
  } catch (error) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, error.message);
  }
}
