const ErrorApi = require('../api/ErrorApi');

function schemaValidator(schema, target = 'body') {
  return function validateRequest(req, res, next) {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false, convert: true, stripUnknown: true,
    });
    if (error) {
      const details = error.details.map((detail) => ({
        message: detail.message, path: detail.path.join('.'),
      }));
      return next(new ErrorApi('Request validation failed', 400, details));
    }
    req.validated = { ...req.validated, [target]: value };
    return next();
  };
}
module.exports = schemaValidator;