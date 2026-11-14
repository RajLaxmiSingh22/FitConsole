import Joi from "joi";
import { idParamsSchema } from "./common.validation.js";

export const acceptWaiverSchema = Joi.object({
  documentReference: Joi.string().max(2048).allow(null, ""),
}).default({});

export const waiverClientParamsSchema = idParamsSchema;

export const publishWaiverSchema = Joi.object({
  text: Joi.string().trim().min(50).max(20000).required(),
});
