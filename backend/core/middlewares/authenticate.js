const { Op } = require('sequelize');
const ErrorApi = require('../api/ErrorApi');
const { verifyAccessToken } = require('../utils/jwt');
const models = require('../database/models');
const security = require('../../modules/settings/security.service');

async function authenticate(req, res, next) {
  const authorizationHeader = req.get('authorization') || '';
  const parts = authorizationHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return next(ErrorApi.unauthorized('توکن Bearer یافت نشد'));
  }

  let payload;
  try {
    payload = verifyAccessToken(parts[1]);
  } catch (error) {
    return next(error);
  }

  const userId = payload?.sub;
  const sessionId = payload?.sid;
  if (!userId || !sessionId) {
    return next(ErrorApi.unauthorized('توکن دسترسی معتبر نیست'));
  }

  try {
    const { User, UserRole, Role, Permission, RefreshSession } = models;
    const associationsReady = User?.associations?.userRole
      && UserRole?.associations?.role
      && Role?.associations?.permissions;
    if (!associationsReady || !RefreshSession) {
      return next(ErrorApi.internalServerError('مدل‌های احراز هویت هنوز به‌درستی تعریف نشده‌اند'));
    }

    const activeSession = await RefreshSession.findOne({
      where: {
        id: sessionId,
        user_id: userId,
        revokedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
      attributes: ['id', 'lastActivityAt'],
    });
    if (!activeSession) return next(ErrorApi.unauthorized('نشست کاربری منقضی یا باطل شده است'));
    const policy = await security.getSettings();
    const now = new Date();
    const lastActivity = new Date(activeSession.lastActivityAt || now);
    if (lastActivity.getTime() + policy.sessionDurationHours * 3600000 <= now.getTime()) {
      return next(ErrorApi.unauthorized('به‌دلیل عدم فعالیت، نشست منقضی شده است؛ دوباره وارد شوید'));
    }
    if (now.getTime() - lastActivity.getTime() >= 5 * 60 * 1000) {
      await activeSession.update({ lastActivityAt: now });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'isactive'],
      include: [{
        model: UserRole,
        as: 'userRole',
        attributes: ['user_id', 'role_id'],
        required: false,
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name'],
          required: false,
          include: [{
            model: Permission,
            as: 'permissions',
            attributes: ['code'],
            through: { attributes: [] },
            required: false,
          }],
        }],
      }],
    });

    if (!user) return next(ErrorApi.unauthorized('کاربر معتبر نیست'));
    if (Number(user.isactive) !== 1) {
      return next(ErrorApi.unauthorized('حساب کاربری غیرفعال یا معتبر نیست'));
    }

    const role = user.userRole?.role;
    if (!role) return next(ErrorApi.forbidden('برای این کاربر نقش معتبری تعریف نشده است'));

    req.auth = payload;
    req.user = {
      id: user.id,
      username: user.username,
      rolename: role.name,
      permissions: [...new Set((role.permissions || []).map(({ code }) => code).filter(Boolean))],
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
