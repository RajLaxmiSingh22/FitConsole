import Joi from "joi";
import { idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";
import { leadStatuses, normalizeIndianMobile } from "../utils/leadWorkflow.js";

const phoneSchema = Joi.string().trim().min(10).max(20).custom((value, helpers) =>
  normalizeIndianMobile(value) ? value : helpers.error("string.phone"),
).messages({ "string.phone": '"phone" must be a valid Indian mobile number' });

const optionalText = (max) => Joi.string().trim().max(max).allow("", null);

export const trialBookingSchema = stripUnknownFields(Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  phone: phoneSchema.required(),
  email: Joi.string().trim().email().max(320).allow("", null),
  courseId: idSchema.allow(null, ""),
  preferredDate: Joi.date().iso().allow(null).custom((value, helpers) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (value < today) return helpers.error("date.min");
    return value;
  }).messages({ "date.min": '"preferredDate" must be today or later' }),
  preferredSlot: optionalText(120),
  message: optionalText(3000),
  consent: Joi.boolean().valid(true).required(),
  source: Joi.string().trim().max(80),
  landingPage: Joi.string().trim().max(512),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(160),
  website: Joi.string().max(0).optional(),
}));

export const leadListQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow(""),
  status: Joi.string().valid(...leadStatuses),
  courseId: idSchema,
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().valid("createdAt", "name", "status", "preferredDate").default("createdAt"),
  order: Joi.string().valid("ASC", "DESC").insensitive().default("DESC"),
}).custom((value, helpers) => {
  if (value.from && value.to && value.from > value.to) return helpers.error("dateRange.order");
  return value;
}).messages({ "dateRange.order": '"from" must be on or before "to"' });

export const leadStatusSchema = Joi.object({
  status: Joi.string().valid(...leadStatuses).required(),
  note: optionalText(2000),
});

export const leadNoteSchema = stripUnknownFields(Joi.object({
  note: Joi.string().trim().min(1).max(2000).required(),
}));

export const leadCourseSchema = Joi.object({
  courseId: idSchema.required(),
});

export const leadIdParamsSchema = idParamsSchema;

export const analyticsEventSchema = stripUnknownFields(Joi.object({
  eventId: idSchema.required(),
  visitorId: idSchema.required(),
  sessionId: idSchema.required(),
  type: Joi.string().valid("page_view", "form_start", "form_submit").required(),
  page: Joi.string().trim().min(1).max(512).required(),
  source: Joi.string().trim().max(80),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(160),
  consent: Joi.boolean().required(),
}));

export const analyticsSummaryQuerySchema = Joi.object({
  from: Joi.date().iso().required(),
  to: Joi.date().iso().required(),
}).custom((value, helpers) => {
  if (value.from > value.to) return helpers.error("dateRange.order");
  if (value.to - value.from > 366 * 24 * 60 * 60 * 1000) return helpers.error("dateRange.range");
  return value;
}).messages({
  "dateRange.order": '"from" must be on or before "to"',
  "dateRange.range": "Date range cannot exceed 366 days",
});

export const leadEnrollmentSchema = Joi.object({
  durationMonths: Joi.number().valid(1, 3, 6, 12).required(),
});
