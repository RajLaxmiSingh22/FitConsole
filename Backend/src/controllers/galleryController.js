import { sequelize } from "../database.js";
import { GalleryItem } from "../models/index.js";
import { destroyMediaQuietly, isCloudinaryConfigured, signDirectUpload, verifyDirectUpload } from "../services/cloudinary.js";

export const GALLERY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const GALLERY_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const GALLERY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const GALLERY_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

// First check of a planned upload from what the browser declares; Cloudinary's allowed_formats and the
// server-side lookup after upload (verifyDirectUpload) check the real file.
export function galleryUploadKind(mimeType, bytes) {
  const type = String(mimeType ?? "").toLowerCase();
  const isImage = GALLERY_IMAGE_TYPES.includes(type);
  const isVideo = GALLERY_VIDEO_TYPES.includes(type);
  if (!isImage && !isVideo) return { error: "Upload a JPEG, PNG or WebP image, or an MP4, MOV or WebM video." };
  const max = isVideo ? GALLERY_VIDEO_MAX_BYTES : GALLERY_IMAGE_MAX_BYTES;
  if (!(bytes > 0) || bytes > max) return { error: isVideo ? "Video is too large (100 MB maximum)." : "Image is too large (10 MB maximum).", status: 413 };
  return { kind: isVideo ? "gallery-video" : "gallery-image", mediaType: isVideo ? "video" : "image" };
}

const notConfigured = (res) => res.status(503).json({ status: "error", message: "Media storage (Cloudinary) is not configured on the server." });

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

// Step 1: sign one direct browser upload to the gallery folder.
export async function signGalleryUpload(req, res) {
  if (!isCloudinaryConfigured()) return notConfigured(res);
  const plan = galleryUploadKind(req.validated.body.mimeType, req.validated.body.bytes);
  if (plan.error) return res.status(plan.status ?? 400).json({ status: "error", message: plan.error });
  try {
    return res.json({ status: "success", data: { ...signDirectUpload({ kind: plan.kind }), mediaType: plan.mediaType } });
  } catch (error) {
    console.error("Gallery upload signing failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to prepare the upload." });
  }
}

// Step 2: after the browser uploaded to Cloudinary, check the asset in our account and save it.
export async function createGalleryItem(req, res) {
  if (!isCloudinaryConfigured()) return notConfigured(res);
  const { publicId, mediaType, title, caption, published } = req.validated.body;
  const kind = mediaType === "video" ? "gallery-video" : "gallery-image";
  try {
    const checked = await verifyDirectUpload({ kind, publicId });
    if (checked.error) {
      if (checked.remove) destroyMediaQuietly(publicId, mediaType);
      return res.status(checked.status).json({ status: "error", message: checked.error });
    }
    const item = await sequelize.transaction(async (transaction) => {
      const last = await GalleryItem.max("sortOrder", { transaction });
      return GalleryItem.create({
        ...checked.asset,
        mediaType,
        title,
        caption: caption || null,
        isPublished: published,
        sortOrder: Number.isFinite(last) ? last + 1 : 0,
        uploadedBy: req.user.id,
      }, { transaction });
    });
    return res.status(201).json({ status: "success", data: item });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ status: "error", message: "This upload is already in the gallery." });
    console.error("Gallery save failed:", error);
    return res.status(502).json({ status: "error", message: "Unable to check the upload with media storage. Try again." });
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
