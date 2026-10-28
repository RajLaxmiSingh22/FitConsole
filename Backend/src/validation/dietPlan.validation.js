import Joi from "joi";
import { idParamsSchema, idSchema, planIdParamsSchema } from "./common.validation.js";

export const generateDietPlanSchema = Joi.object({
  courseId: idSchema.allow(null),
}).default({});

export const updateDietPlanSchema = Joi.object({
  plan: Joi.object().unknown(true).required(),
});

export const dietPlanClientParamsSchema = idParamsSchema;
export const dietPlanIdParamsSchema = planIdParamsSchema;
export const dietPlanTweakParamsSchema = Joi.object({ id: idSchema.required(), planId: idSchema.required() });
