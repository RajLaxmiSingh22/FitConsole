import Joi from "joi";

export function validateRequest(schemas) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const section of ["body", "params", "query"]) {
      const schema = schemas[section];
      if (!schema) continue;

      let result;
      try {
        result = schema.validate(req[section], {
          abortEarly: false,
          convert: true,
        });
      } catch (error) {
        console.error("Request validation middleware failed:", error);
        return res.status(500).json({
          status: "error",
          message: "Unable to validate request.",
        });
      }
      const { error, value } = result;

      if (error) {
        if (!(error instanceof Joi.ValidationError)) {
          console.error("Request validation middleware failed:", error);
          return res.status(500).json({
            status: "error",
            message: "Unable to validate request.",
          });
        }
        details.push(...error.details.map((detail) => ({
          field: [section, ...detail.path].join("."),
          message: detail.message,
        })));
        continue;
      }

      validated[section] = value;
      if (section !== "query") req[section] = value;
    }

    if (details.length) {
      return res.status(400).json({
        status: "error",
        message: "Request validation failed.",
        details,
      });
    }

    req.validated = validated;
    return next();
  };
}
