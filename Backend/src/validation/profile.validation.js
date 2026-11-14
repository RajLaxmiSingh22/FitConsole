import Joi from "joi";
import { stripUnknownFields } from "./common.validation.js";

export const profileUpdateSchema = stripUnknownFields(Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
}));

export const coachingToggleSchema = stripUnknownFields(Joi.object({
  enabled: Joi.boolean().required(),
}));
