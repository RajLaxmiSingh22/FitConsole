import Joi from "joi";
import { stripUnknownFields } from "./common.validation.js";

export const registerValidation = stripUnknownFields(Joi.object({
  fullName: Joi.string().trim().max(255).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
}));

export const loginValidation = stripUnknownFields(Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
}));

export const passwordChangeSchema = stripUnknownFields(Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
}));
