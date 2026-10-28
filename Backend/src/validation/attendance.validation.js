import Joi from "joi";
import { paginationKeys } from "../utils/pagination.js";
import { idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";

export const checkInSchema = stripUnknownFields(Joi.object({
  clientId: idSchema.required(),
  courseId: idSchema.required(),
  override: Joi.boolean(),
  reason: Joi.string().trim().min(1).max(500).when("override", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
}));

export const attendanceQuerySchema = Joi.object({
  date: Joi.date().iso(),
  ...paginationKeys,
});

export const clientAttendanceParamsSchema = idParamsSchema;
