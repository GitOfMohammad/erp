function sendSuccessResponse(res, statusCode, type, message, details) {
  return res.status(statusCode).json({
    success: true,
    type,
    message,
    details,
  });
}

class ResponseApi {
  static ok(res, {
    type = 'SUCCESS',
    message = 'Request successful',
    details = null,
  } = {}) {
    return sendSuccessResponse(res, 200, type, message, details);
  }

  static created(res, {
    type = 'CREATED',
    message = 'Resource created',
    details = null,
  } = {}) {
    return sendSuccessResponse(res, 201, type, message, details);
  }
}

module.exports = ResponseApi;