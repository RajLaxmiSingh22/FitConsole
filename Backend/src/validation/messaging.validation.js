import Joi from "joi";
import { idParamsSchema, idSchema } from "./common.validation.js";

export const startConversationSchema = Joi.object({
  participantId: idSchema.required(),
});

export const sendMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(10000).required(),
});

export const conversationIdParamsSchema = idParamsSchema;
