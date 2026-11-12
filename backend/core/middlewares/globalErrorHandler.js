const env = require('../config/env');
const ErrorApi = require('../api/ErrorApi');

const DATABASE_INPUT_ERROR_CODES = new Set([
  'ER_DATA_TOO_LONG',
  'ER_BAD_NULL_ERROR',
  'ER_TRUNCATED_WRONG_VALUE',
  'ER_NO_DEFAULT_FOR_FIELD',
]);

const DATABASE_CONFLICT_ERROR_CODES = new Set([
  'ER_DUP_ENTRY',
  'ER_NO_REFERENCED_ROW_2',
  'ER_ROW_IS_REFERENCED_2',
]);

function getJoiDetails(error) {
  if (!Array.isArray(error.details)) return null;

  return error.details.map(({ message, path, type }) => ({
    field: Array.isArray(path) ? path.join('.') : '',
    message,
    type,
  }));
}

function getSequelizeDetails(error) {
  if (!Array.isArray(error.errors)) return null;

  return error.errors.map(({ message, path, type }) => ({
    field: path || null,
    message,
    type,
  }));
}

function normalizeError(error) {
  if (error instanceof ErrorApi || error?.name === 'ErrorApi') {
    return {
      statusCode: Number.isInteger(error.statusCode) ? error.statusCode : 500,
      type: error.type || ErrorApi.typeForStatus(error.statusCode || 500),
      message: error.message || 'Internal server error',
      details: error.details ?? null,
    };
  }

  if (error?.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        statusCode: 413,
        type: 'FILE_TOO_LARGE',
        message: 'حجم فایل از حد مجاز بیشتر است',
        details: null,
      };
    }

    return {
      statusCode: 400,
      type: 'INVALID_UPLOAD',
      message: 'درخواست آپلود فایل معتبر نیست',
      details: null,
    };
  }
  if (error?.isJoi || error?.name === 'ValidationError' && Array.isArray(error.details)) {
    return {
      statusCode: 400,
      type: 'VALIDATION_ERROR',
      message: 'اطلاعات ارسال‌شده معتبر نیست',
      details: getJoiDetails(error),
    };
  }

  if (error?.name === 'SequelizeUniqueConstraintError') {
    return {
      statusCode: 409,
      type: 'CONFLICT',
      message: 'رکوردی با این اطلاعات از قبل وجود دارد',
      details: getSequelizeDetails(error),
    };
  }

  if (error?.name === 'SequelizeValidationError') {
    return {
      statusCode: 400,
      type: 'VALIDATION_ERROR',
      message: 'اطلاعات ارسال‌شده معتبر نیست',
      details: getSequelizeDetails(error),
    };
  }

  if (error?.name === 'SequelizeForeignKeyConstraintError') {
    return {
      statusCode: 409,
      type: 'CONFLICT',
      message: 'این عملیات به دلیل وابستگی‌های موجود قابل انجام نیست',
      details: null,
    };
  }

  if (error?.name === 'SequelizeDatabaseError' || error?.name === 'SequelizeConnectionError') {
    return {
      statusCode: 500,
      type: 'DATABASE_ERROR',
      message: 'خطایی در ارتباط با پایگاه داده رخ داد',
      details: null,
    };
  }

  if (error?.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      type: 'UNAUTHORIZED',
      message: 'توکن منقضی شده است',
      details: null,
    };
  }

  if (['JsonWebTokenError', 'NotBeforeError'].includes(error?.name)) {
    return {
      statusCode: 401,
      type: 'UNAUTHORIZED',
      message: 'توکن نامعتبر است',
      details: null,
    };
  }

  if (DATABASE_CONFLICT_ERROR_CODES.has(error?.code)) {
    return {
      statusCode: 409,
      type: 'CONFLICT',
      message: 'این عملیات با اطلاعات فعلی پایگاه داده سازگار نیست',
      details: null,
    };
  }

  if (DATABASE_INPUT_ERROR_CODES.has(error?.code)) {
    return {
      statusCode: 400,
      type: 'BAD_REQUEST',
      message: 'اطلاعات ارسالی برای ذخیره‌سازی معتبر نیست',
      details: null,
    };
  }

  if (error?.type === 'entity.parse.failed' || error?.status === 400 && error?.type === 'entity.parse.failed') {
    return {
      statusCode: 400,
      type: 'BAD_REQUEST',
      message: 'بدنه درخواست قابل خواندن نیست',
      details: null,
    };
  }

  if (error?.status === 429 || error?.statusCode === 429) {
    return {
      statusCode: 429,
      type: 'TOO_MANY_REQUESTS',
      message: 'تعداد درخواست‌ها بیش از حد مجاز است',
      details: null,
    };
  }

  return {
    statusCode: 500,
    type: error?.code && String(error.code).startsWith('ER_') ? 'DATABASE_ERROR' : 'INTERNAL_SERVER_ERROR',
    message: 'خطای داخلی سرور',
    details: null,
  };
}

function globalErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const normalized = normalizeError(error);
  const isDevelopment = env.server.node === 'development';
  const isServerError = normalized.statusCode >= 500;

  const response = {
    success: false,
    type: normalized.type,
    message: isServerError && !isDevelopment
      ? 'خطای داخلی سرور'
      : normalized.message,
    details: normalized.details,
  };

  if (isDevelopment) response.stack = error?.stack || null;

  return res.status(normalized.statusCode).json(response);
}

module.exports = globalErrorHandler;

