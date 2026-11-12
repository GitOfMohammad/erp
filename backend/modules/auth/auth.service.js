const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const ErrorApi = require('../../core/api/ErrorApi');
const env = require('../../core/config/env');
const { sequelize } = require('../../core/database/db');
const { User, UserRole, Role, RefreshSession } = require('../../core/database/models');
const { comparePassword, hashPassword } = require('../../core/utils/bcrypt');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../core/utils/jwt');
const security = require('../settings/security.service');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokenHashMatches(storedHash, suppliedToken) {
  if (typeof storedHash !== 'string') return false;
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(hashToken(suppliedToken), 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function createTokenPair(userId, sessionId, durationHours = 168) {
  const claims = { sub: userId, sid: sessionId };
  const accessToken = signAccessToken({ ...claims, jti: crypto.randomUUID() });
  const refreshToken = signRefreshToken({ ...claims, jti: crypto.randomUUID() }, `${durationHours}h`);
  const decodedRefreshToken = jwt.decode(refreshToken);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    accessTokenExpiresIn: env.jwt.secret_key_expire_time,
    refreshTokenExpiresIn: `${durationHours}h`,
    refreshExpiresAt: new Date(decodedRefreshToken.exp * 1000),
  };
}

function toAuthResult(user, role, tokens) {
  const { refreshExpiresAt, ...publicTokens } = tokens;
  return {
    user: { id: user.id, username: user.username, rolename: role.name },
    tokens: publicTokens,
  };
}

async function findUserRole(userId, transaction) {
  return UserRole.findOne({
    where: { user_id: userId },
    attributes: ['user_id', 'role_id'],
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'], required: false }],
    transaction,
  });
}

async function login({ username, password }, meta = {}) {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw ErrorApi.unauthorized('نام کاربری یا رمز عبور نادرست است');
  }

  const user = await User.unscoped().findOne({
    where: { username },
    attributes: ['id', 'username', 'passwordHash', 'isactive'],
  });

  if (!user || !(await comparePassword(password, user.passwordHash)) || Number(user.isactive) !== 1) {
    await security.recordEvent({ eventType: 'LOGIN_FAILED', userId: user?.id, username, ipAddress: meta.ipAddress, userAgent: meta.userAgent });
    throw ErrorApi.unauthorized('نام کاربری یا رمز عبور نادرست است');
  }

  const userRole = await findUserRole(user.id);
  if (!userRole?.role) {
    throw ErrorApi.forbidden('برای این کاربر نقش معتبری تعریف نشده است');
  }

  const sessionId = crypto.randomUUID();
  const policy = await security.getSettings();
  const tokens = createTokenPair(user.id, sessionId, policy.sessionDurationHours);
  await RefreshSession.create({
    id: sessionId,
    user_id: user.id,
    tokenHash: hashToken(tokens.refreshToken),
    expiresAt: tokens.refreshExpiresAt,
    lastActivityAt: new Date(),
  });

  await security.recordEvent({ eventType: 'LOGIN_SUCCESS', userId: user.id, username, ipAddress: meta.ipAddress, userAgent: meta.userAgent });

  return toAuthResult(user, userRole.role, tokens);
}

async function refresh(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload.sub || !payload.sid) {
    throw ErrorApi.unauthorized('توکن تمدید معتبر نیست');
  }

  return sequelize.transaction(async (transaction) => {
    const session = await RefreshSession.findByPk(payload.sid, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const policy = await security.getSettings();
    if (
      !session ||
      session.user_id !== payload.sub ||
      session.revokedAt ||
      new Date(session.expiresAt).getTime() <= Date.now() ||
      !tokenHashMatches(session.tokenHash, refreshToken)
    ) {
      throw ErrorApi.unauthorized('نشست یا توکن تمدید معتبر نیست');
    }
    if (new Date(session.lastActivityAt || session.updated_at).getTime() + policy.sessionDurationHours * 3600000 <= Date.now()) {
      throw ErrorApi.unauthorized('به‌دلیل عدم فعالیت، نشست منقضی شده است؛ دوباره وارد شوید');
    }

    const user = await User.findByPk(payload.sub, {
      attributes: ['id', 'username', 'isactive'],
      transaction,
    });
    if (!user || Number(user.isactive) !== 1) {
      throw ErrorApi.unauthorized('حساب کاربری معتبر یا فعال نیست');
    }

    const userRole = await findUserRole(user.id, transaction);
    if (!userRole?.role) {
      throw ErrorApi.forbidden('برای این کاربر نقش معتبری تعریف نشده است');
    }

    const tokens = createTokenPair(user.id, session.id, policy.sessionDurationHours);
    session.tokenHash = hashToken(tokens.refreshToken);
    session.expiresAt = tokens.refreshExpiresAt;
    session.lastActivityAt = new Date();
    await session.save({ transaction });

    return toAuthResult(user, userRole.role, tokens);
  });
}

async function logout(userId, sessionId, meta = {}) {
  const [revokedCount] = await RefreshSession.update({ revokedAt: new Date() }, {
    where: { id: sessionId, user_id: userId, revokedAt: null },
  });
  if (revokedCount !== 1) throw ErrorApi.unauthorized('این نشست قبلاً باطل شده است');
  await security.recordEvent({ eventType: 'LOGOUT', userId, username: meta.username, ipAddress: meta.ipAddress, userAgent: meta.userAgent });
}

async function changePassword(userId, { currentPassword, newPassword }, meta = {}) {
  if (Buffer.byteLength(currentPassword, 'utf8') > 72 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    throw ErrorApi.badRequest('رمز عبور نباید بیشتر از ۷۲ بایت باشد');
  }
  const policy = await security.getSettings();
  security.validatePassword(newPassword, policy);
  const result = await sequelize.transaction(async (transaction) => {
    const user = await User.unscoped().findByPk(userId, {
      attributes: ['id', 'passwordHash'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) throw ErrorApi.notFound('حساب کاربری پیدا نشد');
    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      throw ErrorApi.unauthorized('رمز عبور فعلی نادرست است');
    }
    if (await comparePassword(newPassword, user.passwordHash)) {
      throw ErrorApi.badRequest('رمز عبور جدید باید با رمز فعلی متفاوت باشد');
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save({ transaction });
    await RefreshSession.update({ revokedAt: new Date() }, {
      where: { user_id: userId, revokedAt: null },
      transaction,
    });
    return { changed: true };
  });
  await security.recordEvent({ eventType: 'PASSWORD_CHANGED', userId, username: meta.username, ipAddress: meta.ipAddress, userAgent: meta.userAgent });
  return result;
}

module.exports = { login, refresh, logout, changePassword };
