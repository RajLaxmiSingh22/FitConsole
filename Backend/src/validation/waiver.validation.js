import Joi from "joi";
import { idParamsSchema } from "./common.validation.js";

export const acceptWaiverSchema = Joi.object({
  documentReference: Joi.string().max(2048).allow(null, ""),
}).default({});

export const waiverClientParamsSchema = idParamsSchema;
