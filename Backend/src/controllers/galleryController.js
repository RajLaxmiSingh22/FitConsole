import { sequelize } from "../database.js";
import { GalleryItem } from "../models/index.js";
import { destroyMediaQuietly, isCloudinaryConfigured, uploadGalleryMedia } from "../services/cloudinary.js";
import { detectImageType } from "./profileController.js";

export const GALLERY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const GALLERY_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const GALLERY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const GALLERY_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

// MP4 and MOV share the ISO-BMFF "ftyp" box at byte 4; WebM starts with the EBML header.
export function detectVideoType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return buffer.subarray(8, 10).toString("ascii") === "qt" ? "video/quicktime" : "video/mp4";
  }
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "video/webm";
  return null;
}

// Returns { mediaType, mimeType } or an error message for a raw upload body.
export function classifyGalleryUpload(buffer, declaredType) {
  const declared = declaredType?.split(";")[0].trim().toLowerCase();
  if (GALLERY_IMAGE_TYPES.includes(declared)) {
    if (detectImageType(buffer) !== declared) return { error: "Upload a JPEG, PNG or WebP image." };
    if (buffer.length > GALLERY_IMAGE_MAX_BYTES) return { error: "Image is too large (10 MB maximum).", status: 413 };
    return { mediaType: "image", mimeType: declared };
  }
  if (GALLERY_VIDEO_TYPES.includes(declared)) {
    const detected = detectVideoType(buffer);
    // Browsers label .mov files inconsistently, so any ISO-BMFF video is accepted as MP4/MOV.
    const matches = detected === declared || (detected && detected !== "video/webm" && declared !== "video/webm");
    if (!matches) return { error: "Upload an MP4, MOV or WebM video." };
    if (buffer.length > GALLERY_VIDEO_MAX_BYTES) return { error: "Video is too large (100 MB maximum).", status: 413 };
    return { mediaType: "video", mimeType: detected };
  }
  return { error: "Upload a JPEG, PNG or WebP image, or an MP4, MOV or WebM video." };
}

const publicFields = ["id", "mediaType", "title", "caption", "url", "posterUrl", "width", "height"];
const order = [["sortOrder", "ASC"], ["createdAt", "DESC"]];

export async function listPublicGallery(_req, res) {
  try {
    const items = await GalleryItem.findAll({ where: { isPublished: true }, attributes: publicFields, order, limit: 60 });
    res.set("Cache-Control", "public, max-age=60");
    return res.json({ status: "success", data: items });
  } catch (error) {
    console.error("Public gallery lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load the gallery." });
  }
}

export async function listGallery(_req, res) {
  try {
    const items = await GalleryItem.findAll({ order });
    return res.json({ status: "success", data: { items, storageConfigured: isCloudinaryConfigured() } });
  } catch (error) {
    console.error("Gallery lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load the gallery." });
  }
}

export async function uploadGalleryItem(req, res) {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ status: "error", message: "Media storage (Cloudinary) is not configured on the server." });
  }
  const kind = classifyGalleryUpload(req.body, req.headers["content-type"]);
  if (kind.error) return res.status(kind.status ?? 400).json({ status: "error", message: kind.error });
  let uploaded;
  try {
    uploaded = await uploadGalleryMedia({ buffer: req.body, mimeType: kind.mimeType, mediaType: kind.mediaType });
    const { title, caption, published } = req.validated.query;
    const item = await sequelize.transaction(async (transaction) => {
      const last = await GalleryItem.max("sortOrder", { transaction });
      return GalleryItem.create({
        ...uploaded,
        mediaType: kind.mediaType,
        title,
        caption: caption || null,
        isPublished: published,
        sortOrder: Number.isFinite(last) ? last + 1 : 0,
        uploadedBy: req.user.id,
      }, { transaction });
    });
    return res.status(201).json({ status: "success", data: item });
  } catch (error) {
    console.error("Gallery upload failed:", error);
    if (uploaded) await destroyMediaQuietly(uploaded.publicId, kind.mediaType);
    return res.status(502).json({ status: "error", message: "Unable to upload to media storage. Try again." });
  }
}

export async function updateGalleryItem(req, res) {
  try {
    const item = await GalleryItem.findByPk(req.validated.params.id);
    if (!item) return res.status(404).json({ status: "error", message: "Gallery item not found." });
    const { caption, ...changes } = req.validated.body;
    await item.update({ ...changes, ...(caption !== undefined ? { caption: caption || null } : {}) });
    return res.json({ status: "success", data: item });
  } catch (error) {
    console.error("Gallery update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update the gallery item." });
  }
}

export async function reorderGallery(req, res) {
  try {
    const { ids } = req.validated.body;
    await sequelize.transaction(async (transaction) => {
      for (const [index, id] of ids.entries()) {
        await GalleryItem.update({ sortOrder: index }, { where: { id }, transaction });
      }
    });
    return res.json({ status: "success", data: await GalleryItem.findAll({ order }) });
  } catch (error) {
    console.error("Gallery reorder failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to reorder the gallery." });
  }
}

export async function deleteGalleryItem(req, res) {
  try {
    const item = await GalleryItem.findByPk(req.validated.params.id);
    if (!item) return res.status(404).json({ status: "error", message: "Gallery item not found." });
    await item.destroy();
    destroyMediaQuietly(item.publicId, item.mediaType);
    return res.json({ status: "success", data: { id: item.id } });
  } catch (error) {
    console.error("Gallery delete failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to delete the gallery item." });
  }
}
