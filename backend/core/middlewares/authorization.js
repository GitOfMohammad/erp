const ErrorApi = require('../api/ErrorApi');

function authorization(permission) {
  return (req, res, next) => {
    if (!req.user) throw ErrorApi.unauthorized('ابتدا باید وارد حساب کاربری شوید');

    if (typeof permission !== 'string' || permission.trim() === '') {
      throw ErrorApi.internalServerError('دسترسی این مسیر به‌درستی تعریف نشده است');
    }

    const userPermissions = Array.isArray(req.user.permissions)
      ? req.user.permissions
      : [];

    if (!userPermissions.includes(permission)) {
      throw ErrorApi.forbidden('شما دسترسی لازم برای انجام این عملیات را ندارید');
    }
    return next();
  };
}

module.exports = authorization;
