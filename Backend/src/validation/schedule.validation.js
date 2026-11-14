import Joi from "joi";
import { idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";

// 24-hour HH:MM gym-local time.
const timeSchema = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).messages({ "string.pattern.base": "{#label} must be a time like 06:30" });

const sessionFields = {
  courseId: idSchema,
  trainerId: idSchema.allow(null),
  weekday: Joi.number().integer().min(1).max(7),
  startTime: timeSchema,
  endTime: timeSchema,
  level: Joi.string().trim().max(40).allow("", null),
  active: Joi.boolean(),
};

const endAfterStart = (value, helpers) => {
  if (value.startTime && value.endTime && value.endTime <= value.startTime) return helpers.error("time.order");
  return value;
};
const timeOrderMessage = { "time.order": '"endTime" must be after "startTime"' };

export const createClassSessionSchema = stripUnknownFields(Joi.object({
  ...sessionFields,
  courseId: sessionFields.courseId.required(),
  weekday: sessionFields.weekday.required(),
  startTime: sessionFields.startTime.required(),
  endTime: sessionFields.endTime.required(),
}).custom(endAfterStart).messages(timeOrderMessage));

export const updateClassSessionSchema = stripUnknownFields(Joi.object(sessionFields).min(1).custom(endAfterStart).messages(timeOrderMessage));

export const classSessionIdParamsSchema = idParamsSchema;
