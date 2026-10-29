import Joi from "joi";
import { paginationKeys } from "../utils/pagination.js";
import { idParamsSchema, stripUnknownFields } from "./common.validation.js";

export const trainerProvisionSchema = stripUnknownFields(Joi.object({
  fullName: Joi.string().trim().max(255).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(12).max(128).required(),
  phone: Joi.string().max(40).allow("", null),
  certification: Joi.string().max(255).allow("", null),
  experienceYears: Joi.number().min(0).max(999.9).allow(null),
}));

export const userListQuerySchema = Joi.object({
  role: Joi.string().valid("owner", "trainer", "client"),
  search: Joi.string().trim().max(120).allow(""),
  active: Joi.boolean(),
  ...paginationKeys,
});

export const updateUserStatusSchema = Joi.object({
  active: Joi.boolean().required(),
});

export const userIdParamsSchema = idParamsSchema;
