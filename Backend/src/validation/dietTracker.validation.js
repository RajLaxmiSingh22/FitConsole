import Joi from "joi";
import { dateRangeSchema, entryIdParamsSchema, idParamsSchema, stripUnknownFields } from "./common.validation.js";

export const dietEntrySchema = stripUnknownFields(Joi.object({
  recordedOn: Joi.date().iso(),
  weightKg: Joi.number().positive(),
  sleepDurationHours: Joi.number().min(0).max(24),
  hunger: Joi.string().max(100).allow("", null),
  mood: Joi.string().max(100).allow("", null),
  triggers: Joi.string().allow("", null),
  calories: Joi.number().integer().min(0),
  macronutrients: Joi.object().unknown(true),
  fiberGrams: Joi.number().min(0),
  waterLiters: Joi.number().min(0),
}).min(1));

export const dietEntriesQuerySchema = dateRangeSchema;
export const dietClientParamsSchema = idParamsSchema;
export const dietEntryParamsSchema = entryIdParamsSchema;
