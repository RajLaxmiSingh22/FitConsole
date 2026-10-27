import Joi from "joi";
import { idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";

const coursePlanSchema = Joi.object({
  durationMonths: Joi.number().valid(1, 3, 6, 12).required(),
  price: Joi.number().positive().required(),
});

export const createCourseSchema = stripUnknownFields(Joi.object({
  name: Joi.string().trim().max(255).required(),
  category: Joi.string().trim().max(100).required(),
  description: Joi.string().allow("", null),
  plans: Joi.array().items(coursePlanSchema).min(1).unique("durationMonths").required(),
}));

export const updateCourseSchema = stripUnknownFields(Joi.object({
  name: Joi.string().trim().max(255),
  category: Joi.string().trim().max(100),
  description: Joi.string().allow("", null),
  active: Joi.boolean(),
  plans: Joi.array().items(coursePlanSchema).min(1).unique("durationMonths"),
}).min(1));

export const setCourseTrainersSchema = Joi.object({
  trainerIds: Joi.array().items(idSchema).unique().required(),
});

export const courseIdParamsSchema = idParamsSchema;
