import { createHash, randomUUID } from "node:crypto";

// Signed Cloudinary uploads over the REST API. Credentials stay on the server.
//
// Folder layout (under CLOUDINARY_ROOT_FOLDER, default "fitconsole"):
//   <root>/users/avatars/<owner|trainer|client>/<userId>/<random>   profile photos
//   <root>/gallery/images/<random>                                   gallery photos
//   <root>/gallery/videos/<random>                                   gallery videos
//   <root>/courses/<courseId>/<random>                               course covers (1200x675 WebP)
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

export async function uploadGalleryMedia({ buffer, mimeType, mediaType }) {
  const config = requireConfig();
  const result = await callCloudinary(config, mediaType, "upload", {
    folder: galleryFolder(config.root, mediaType),
    public_id: randomUUID(),
    overwrite: "false",
  }, { buffer, mimeType });
  return {
    publicId: result.public_id,
    url: result.secure_url,
    // Cloudinary renders a still frame for any video when the extension is swapped to .jpg.
    posterUrl: mediaType === "video" ? result.secure_url.replace(/\.[a-z0-9]+$/i, ".jpg") : null,
    width: result.width ?? null,
    height: result.height ?? null,
    bytes: result.bytes ?? null,
  };
}

// Course covers are cropped to 16:9 (1200x675) and stored as WebP. Cloudinary re-encodes the
// image on upload, which also drops EXIF metadata such as phone GPS locations.
export async function uploadCourseCover({ buffer, mimeType, courseId }) {
  const config = requireConfig();
  const result = await callCloudinary(config, "image", "upload", {
    folder: `${config.root}/courses/${courseId}`,
    public_id: randomUUID(),
    overwrite: "false",
    transformation: "c_fill,g_auto,w_1200,h_675",
    format: "webp",
  }, { buffer, mimeType });
  return { publicId: result.public_id, url: result.secure_url };
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
