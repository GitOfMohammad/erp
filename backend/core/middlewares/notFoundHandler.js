const ErrorApi = require('../api/ErrorApi');
function notFoundHandler(req, res, next) {
  next(new ErrorApi('Route not found: ' + req.method + ' ' + req.originalUrl, 404));
}
module.exports = notFoundHandler;