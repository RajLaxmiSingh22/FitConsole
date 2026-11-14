import Joi from "joi";
import { idParamsSchema, stripUnknownFields } from "./common.validation.js";

export const memberAnalyticsQuerySchema = Joi.object({
  range: Joi.number().integer().valid(30, 60, 90).default(30),
});

export const memberCalendarQuerySchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required().messages({ "string.pattern.base": '"month" must look like 2026-11' }),
});

const scale = Joi.number().integer().min(1).max(5).required();

export const wellnessCheckinSchema = stripUnknownFields(Joi.object({
  mood: Joi.string().valid("happy", "neutral", "low").required(),
  energy: scale,
  stress: scale,
  motivation: scale,
  soreness: scale,
  digestion: Joi.number().integer().min(1).max(5).allow(null),
  sleepHours: Joi.number().min(0).max(24).allow(null),
  pain: Joi.boolean().default(false),
  problem: Joi.string().trim().max(1000).allow("", null),
  notes: Joi.string().trim().max(1000).allow("", null),
}));

export const wellnessQuerySchema = Joi.object({
  range: Joi.number().integer().valid(30, 60, 90).default(90),
});

export const trainerNoteSchema = stripUnknownFields(Joi.object({
  kind: Joi.string().valid("note", "recommendation").required(),
  body: Joi.string().trim().min(1).max(2000).required(),
}));

export const attendanceIdParamsSchema = idParamsSchema;

const isoDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
export const gymOverviewQuerySchema = Joi.object({ from: isoDate, to: isoDate }).custom((value, helpers) => {
  if (value.from && value.to && value.from > value.to) return helpers.error("range.order");
  return value;
}).messages({ "range.order": '"from" must be on or before "to"' });
