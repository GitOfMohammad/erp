const ErrorApi = require('../api/ErrorApi');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function idValidator(parameterName = 'id') {
  return function validateId(req, res, next) {
    if (!uuidPattern.test(req.params[parameterName] || '')) {
      return next(new ErrorApi('Invalid ' + parameterName, 400));
    }
    return next();
  };
}
module.exports = idValidator;