import Joi from "joi";

export const ownerEnvironmentSchema = Joi.object({
  OWNER_NAME: Joi.string().trim().min(1).max(255).default("FitConsole Owner"),
  OWNER_EMAIL: Joi.string().trim().email().lowercase().required(),
  OWNER_PASSWORD: Joi.string().min(12).max(128).required(),
}).unknown(true);

export const trainerEnvironmentSchema = Joi.object({
  TRAINER_1_NAME: Joi.string().trim().min(1).max(255).empty(""),
  TRAINER_1_EMAIL: Joi.string().trim().email().lowercase().empty(""),
  TRAINER_1_PASSWORD: Joi.string().min(12).max(128).empty(""),
  TRAINER_2_NAME: Joi.string().trim().min(1).max(255).empty(""),
  TRAINER_2_EMAIL: Joi.string().trim().email().lowercase().empty(""),
  TRAINER_2_PASSWORD: Joi.string().min(12).max(128).empty(""),
  TRAINER_3_NAME: Joi.string().trim().min(1).max(255).empty(""),
  TRAINER_3_EMAIL: Joi.string().trim().email().lowercase().empty(""),
  TRAINER_3_PASSWORD: Joi.string().min(12).max(128).empty(""),
}).unknown(true);
