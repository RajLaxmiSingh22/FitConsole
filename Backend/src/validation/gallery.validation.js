import Joi from "joi";
import { stripUnknownFields } from "./common.validation.js";

const title = Joi.string().trim().min(2).max(80);
const caption = Joi.string().trim().max(160).allow("");

// A planned direct upload: the browser declares type and size before Cloudinary checks the real file.
export const directUploadRequestSchema = stripUnknownFields(Joi.object({
  mimeType: Joi.string().trim().lowercase().max(100).required(),
  bytes: Joi.number().integer().min(1).max(2 * 1024 * 1024 * 1024).required(),
}));

// Cloudinary public_id returned by a signed direct upload (checked against our folder on the server).
export const cloudinaryPublicId = Joi.string().max(255).pattern(/^[A-Za-z0-9_\-/]+$/);

export const galleryCreateSchema = stripUnknownFields(Joi.object({
  publicId: cloudinaryPublicId.required(),
  mediaType: Joi.string().valid("image", "video").required(),
  title: title.required(),
  caption: caption.default(""),
  published: Joi.boolean().default(true),
}));

export const galleryUpdateSchema = stripUnknownFields(Joi.object({
  title,
  caption,
  isPublished: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0).max(10000),
}).min(1));

export const galleryReorderSchema = stripUnknownFields(Joi.object({
  ids: Joi.array().items(Joi.string().guid({ version: "uuidv4" })).min(1).max(500).unique().required(),
}));
