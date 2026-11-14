import Joi from "joi";
import { stripUnknownFields } from "./common.validation.js";

const title = Joi.string().trim().min(2).max(80);
const caption = Joi.string().trim().max(160).allow("");

// Upload metadata travels in the query string because the body is the raw file.
export const galleryUploadQuerySchema = stripUnknownFields(Joi.object({
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
