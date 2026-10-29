import Joi from "joi";

const isoDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({ "string.pattern.base": "{#label} must be a YYYY-MM-DD date" });

export const reportRangeQuerySchema = Joi.object({ from: isoDate, to: isoDate });
