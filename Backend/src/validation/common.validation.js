import Joi from "joi";

export const stripUnknownFields = (schema) => schema.prefs({
  stripUnknown: { objects: true },
});

export const idSchema = Joi.string().guid({ version: ["uuidv4"] });
export const idParamsSchema = Joi.object({ id: idSchema.required() });
export const entryIdParamsSchema = Joi.object({ entryId: idSchema.required() });
export const planIdParamsSchema = Joi.object({ planId: idSchema.required() });

export const dateRangeSchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
}).custom((value, helpers) => {
  if (value.from && value.to && value.from > value.to) {
    return helpers.error("dateRange.order");
  }
  return value;
}).messages({ "dateRange.order": '"from" must be on or before "to"' });
