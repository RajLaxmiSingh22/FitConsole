import Joi from "joi";
import { paginationKeys } from "../utils/pagination.js";
import { idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";

export const createMembershipSchema = stripUnknownFields(Joi.object({
  clientId: Joi.string().guid({ version: ["uuidv4"] }).required(),
  courseId: Joi.string().guid({ version: ["uuidv4"] }).required(),
  durationMonths: Joi.number().valid(1, 3, 6, 12).required(),
  startDate: Joi.date().iso().allow(null),
  paymentMethod: Joi.string().valid("cash", "upi", "card"),
  reference: Joi.string().max(255).allow("", null),
}));

export const createClientMembershipSchema = stripUnknownFields(Joi.object({
  courseId: Joi.string().guid({ version: ["uuidv4"] }).required(),
  durationMonths: Joi.number().valid(1, 3, 6, 12).required(),
}));

export const listMembershipsQuerySchema = Joi.object({
  status: Joi.string().valid("active", "pending_payment", "expired", "cancelled"),
  expiringWithin: Joi.number().integer().min(0).max(365),
  courseId: idSchema,
  search: Joi.string().trim().max(120).allow(""),
  ...paginationKeys,
});

export const renewMembershipSchema = stripUnknownFields(Joi.object({
  durationMonths: Joi.number().valid(1, 3, 6, 12),
}));

export const membershipIdParamsSchema = idParamsSchema;
export const clientMembershipParamsSchema = idParamsSchema;
