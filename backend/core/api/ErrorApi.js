const ERROR_TYPES = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_SERVER_ERROR',
});

class ErrorApi extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'ErrorApi';
    this.statusCode = statusCode;
    this.type = ErrorApi.typeForStatus(statusCode);
    this.details = details;
    Error.captureStackTrace?.(this, ErrorApi);
  }

  static typeForStatus(statusCode) {
    return ERROR_TYPES[statusCode] || 'INTERNAL_SERVER_ERROR';
  }

  static badRequest(message = 'Bad request', details = null) {
    return new ErrorApi(message, 400, details);
  }

  static unauthorized(message = 'Authentication required', details = null) {
    return new ErrorApi(message, 401, details);
  }

  static forbidden(message = 'Access forbidden', details = null) {
    return new ErrorApi(message, 403, details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new ErrorApi(message, 404, details);
  }

  static conflict(message = 'Resource conflict', details = null) {
    return new ErrorApi(message, 409, details);
  }

  static internalServerError(message = 'Internal server error') {
    return new ErrorApi(message, 500);
  }
}

module.exports = ErrorApi;