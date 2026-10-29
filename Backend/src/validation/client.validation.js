import Joi from "joi";
import { paginationKeys } from "../utils/pagination.js";
import { ALLERGY_TAGS, DIET_PREFERENCES, GOAL_CATEGORIES } from "../utils/dietProfile.js";
import { idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";

const profileFields = {
  phone: Joi.string().max(40).allow("", null),
  emergencyContactPhone: Joi.string().max(40).allow("", null),
  dateOfBirth: Joi.date().iso().allow(null),
  heightCm: Joi.number().positive().allow(null),
  weightKg: Joi.number().positive().allow(null),
  goal: Joi.string().allow("", null),
  healthIssues: Joi.string().allow("", null),
  injuries: Joi.string().allow("", null),
  bloodGroup: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-").allow(null),
  address: Joi.string().allow("", null),
  gender: Joi.string().max(40).allow("", null),
  goalCategory: Joi.string().valid(...GOAL_CATEGORIES).allow(null),
  dietPreference: Joi.string().valid(...DIET_PREFERENCES).allow(null),
  allergies: Joi.array().items(Joi.string().valid(...ALLERGY_TAGS)).unique().max(ALLERGY_TAGS.length),
};

export const createClientSchema = stripUnknownFields(Joi.object({
  fullName: Joi.string().trim().max(255).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(12).max(128).required(),
  ...profileFields,
}));

export const updateClientSchema = stripUnknownFields(Joi.object(profileFields).min(1));
export const clientIdParamsSchema = idParamsSchema;
export const assignTrainerSchema = Joi.object({ trainerId: idSchema.allow(null).required() });
export const idProofSchema = Joi.object({
  reference: Joi.string().trim().max(2048).required(),
});
export const optionalClientIdParamsSchema = Joi.object({ id: idSchema });

export const clientListQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow(""),
  trainerId: idSchema,
  ...paginationKeys,
});

// Opt-in paging for a single client's history lists (memberships, payments, attendance, progress).
export const clientHistoryQuerySchema = Joi.object({ ...paginationKeys });

export const progressEntrySchema = stripUnknownFields(Joi.object({
  weightKg: Joi.number().positive().max(400).allow(null),
  stamina: Joi.number().integer().min(1).max(10).allow(null),
  note: Joi.string().trim().max(500).allow("", null),
}).or("weightKg", "stamina", "note"));
