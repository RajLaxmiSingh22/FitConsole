import Joi from "joi";
import { idParamsSchema, stripUnknownFields } from "./common.validation.js";

export const trainerProfileSchema = stripUnknownFields(Joi.object({
  phone: Joi.string().max(40).allow("", null),
  emergencyContactPhone: Joi.string().max(40).allow("", null),
  dateOfBirth: Joi.date().iso().allow(null),
  heightCm: Joi.number().positive().allow(null),
  weightKg: Joi.number().positive().allow(null),
  healthIssues: Joi.string().allow("", null),
  injuries: Joi.string().allow("", null),
  bloodGroup: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-").allow(null),
  address: Joi.string().allow("", null),
  gender: Joi.string().max(40).allow("", null),
  experienceYears: Joi.number().min(0).max(999.9).allow(null),
  certification: Joi.string().max(255).allow("", null),
}).min(1));

export const trainerIdParamsSchema = idParamsSchema;
