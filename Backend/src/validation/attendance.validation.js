import Joi from "joi";
import { idParamsSchema, idSchema } from "./common.validation.js";

export const checkInSchema = Joi.object({
  clientId: idSchema.required(),
  courseId: idSchema.required(),
});

export const attendanceQuerySchema = Joi.object({
  date: Joi.date().iso(),
});

export const clientAttendanceParamsSchema = idParamsSchema;
