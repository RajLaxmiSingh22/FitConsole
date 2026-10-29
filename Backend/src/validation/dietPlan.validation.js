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

// Shape of a generated or edited diet plan document.
const mealItemSchema = Joi.object({
  food: Joi.string().trim().min(1).max(200).required(),
  quantity: Joi.string().trim().min(1).max(100).required(),
  calories: Joi.number().min(0).max(3000).required(),
  proteinG: Joi.number().min(0).max(300).required(),
});

export const dietPlanSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  dailyCalories: Joi.number().min(800).max(6000).required(),
  macros: Joi.object({
    proteinG: Joi.number().min(0).max(600).required(),
    carbsG: Joi.number().min(0).max(1200).required(),
    fatG: Joi.number().min(0).max(400).required(),
  }).required(),
  meals: Joi.array().min(1).max(10).items(Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    time: Joi.string().trim().min(1).max(50).required(),
    items: Joi.array().min(1).max(20).items(mealItemSchema).required(),
  })).required(),
  hydrationLitres: Joi.number().min(0.5).max(10).required(),
  notes: Joi.array().max(20).items(Joi.string().trim().max(500)).required(),
}).prefs({ stripUnknown: true });
