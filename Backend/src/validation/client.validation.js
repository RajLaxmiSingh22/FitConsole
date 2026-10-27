import Joi from "joi";
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
};

export const createClientSchema = stripUnknownFields(Joi.object({
  fullName: Joi.string().trim().max(255).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  ...profileFields,
}));

export const updateClientSchema = stripUnknownFields(Joi.object(profileFields).min(1));
export const clientIdParamsSchema = idParamsSchema;
export const assignTrainerSchema = Joi.object({ trainerId: idSchema.allow(null).required() });
export const idProofSchema = Joi.object({
  reference: Joi.string().trim().max(2048).required(),
});
export const optionalClientIdParamsSchema = Joi.object({ id: idSchema });
