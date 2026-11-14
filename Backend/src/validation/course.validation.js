import { PLAN_DURATIONS } from "../utils/plans.js";
import Joi from "joi";
import { idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";

const coursePlanSchema = Joi.object({
  durationMonths: Joi.number().valid(...PLAN_DURATIONS).required(),
  price: Joi.number().positive().required(),
});

// Longer plans must cost at least as much as shorter ones (1m ≤ 2m ≤ 3m ≤ 6m ≤ 12m).
export function planPriceOrderError(plans = []) {
  const sorted = [...plans].sort((a, b) => a.durationMonths - b.durationMonths);
  for (let index = 1; index < sorted.length; index += 1) {
    if (Number(sorted[index].price) < Number(sorted[index - 1].price)) {
      return `The ${sorted[index].durationMonths}-month price must be at least the ${sorted[index - 1].durationMonths}-month price.`;
    }
  }
  return null;
}

const orderedPlans = (value, helpers) => {
  const message = planPriceOrderError(value);
  return message ? helpers.message(message) : value;
};

export const createCourseSchema = stripUnknownFields(Joi.object({
  name: Joi.string().trim().max(255).required(),
  category: Joi.string().trim().max(100).required(),
  description: Joi.string().allow("", null),
  minAge: Joi.number().integer().min(3).max(100).allow(null),
  maxAge: Joi.number().integer().min(3).max(100).allow(null),
  level: Joi.string().valid("beginner", "intermediate", "advanced", "all_levels").allow(null),
  plans: Joi.array().items(coursePlanSchema).min(1).unique("durationMonths").custom(orderedPlans).required(),
}));

export const updateCourseSchema = stripUnknownFields(Joi.object({
  name: Joi.string().trim().max(255),
  category: Joi.string().trim().max(100),
  description: Joi.string().allow("", null),
  active: Joi.boolean(),
  minAge: Joi.number().integer().min(3).max(100).allow(null),
  maxAge: Joi.number().integer().min(3).max(100).allow(null),
  level: Joi.string().valid("beginner", "intermediate", "advanced", "all_levels").allow(null),
  plans: Joi.array().items(coursePlanSchema).min(1).unique("durationMonths").custom(orderedPlans),
  coverImageAlt: Joi.string().trim().max(200).allow("", null),
  coverDefault: Joi.string().valid("combat", "conditioning", "kids", "strength").allow(null),
}).min(1));

export const courseCoverSaveSchema = stripUnknownFields(Joi.object({
  publicId: Joi.string().max(255).pattern(/^[A-Za-z0-9_\-/]+$/).required(),
  alt: Joi.string().trim().max(200).allow(""),
}));

export const setCourseTrainersSchema = Joi.object({
  trainerIds: Joi.array().items(idSchema).unique().required(),
});

export const courseIdParamsSchema = idParamsSchema;
