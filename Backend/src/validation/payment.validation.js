import Joi from "joi";
import { paginationKeys } from "../utils/pagination.js";
import { dateRangeSchema, idParamsSchema, idSchema, stripUnknownFields } from "./common.validation.js";

export const createPaymentSchema = stripUnknownFields(Joi.object({
  clientId: idSchema.required(),
  membershipId: idSchema.allow(null),
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid("cash", "upi", "card").required(),
  reference: Joi.string().max(255).allow("", null),
  reminderDate: Joi.date().iso().allow(null),
}));

export const paymentQuerySchema = dateRangeSchema.keys({
  paymentMethod: Joi.string().valid("cash", "upi", "card"),
  clientId: idSchema,
  ...paginationKeys,
});

export const updatePaymentSchema = stripUnknownFields(Joi.object({
  amount: Joi.number().positive(),
  paymentMethod: Joi.string().valid("cash", "upi", "card"),
  reference: Joi.string().max(255).allow("", null),
  reminderDate: Joi.date().iso().allow(null),
}).min(1));

export const voidPaymentSchema = stripUnknownFields(Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
}));

export const paymentIdParamsSchema = idParamsSchema;
export const reminderParamsSchema = Joi.object({
  paymentId: Joi.string().guid({ version: ["uuidv4"] }).required(),
});
export const clientPaymentParamsSchema = idParamsSchema;

export const createCashfreeOrderSchema = stripUnknownFields(Joi.object({
  clientId: idSchema,
  membershipId: idSchema,
  amount: Joi.number().positive().precision(2),
  reminderDate: Joi.date().iso().allow(null),
}).or("clientId", "membershipId").custom((value, helpers) => {
  if (value.clientId && !value.amount) {
    return helpers.error("any.custom", { message: "An amount is required when creating an owner checkout." });
  }
  if (!value.clientId && (value.amount || value.reminderDate)) {
    return helpers.error("any.custom", { message: "Client checkout accepts only a membership ID." });
  }
  return value;
}));

export const cashfreeOrderIdParamsSchema = Joi.object({
  orderId: Joi.string().pattern(/^[A-Za-z0-9_-]{1,50}$/).required(),
});
