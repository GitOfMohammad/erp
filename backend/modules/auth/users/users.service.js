const ErrorApi = require('../../../core/api/ErrorApi');
const { sequelize } = require('../../../core/database/db');
const { RefreshSession } = require('../../../core/database/models');
const { hashPassword } = require('../../../core/utils/bcrypt');
const security = require('../../settings/security.service');
const repository = require('./users.repository');

function toPublicUser(user) {
  const plainUser = typeof user.get === 'function' ? user.get({ plain: true }) : user;
  const { id, username, phone, isactive, created_at, updated_at } = plainUser;
  const role = plainUser.userRole?.role;
  return {
    id,
    username,
    phone,
    isactive,
    role: role ? { id: role.id, name: role.name } : null,
    created_at,
    updated_at,
  };
}

function normalizePhone(phone) {
  return phone === '' || phone === undefined ? null : phone;
}

async function list({ page, limit, search }) {
  const result = await repository.findAll({
    limit,
    offset: (page - 1) * limit,
    search,
  });

  return {
    items: result.rows.map(toPublicUser),
    pagination: {
      page,
      limit,
      totalItems: result.count,
      totalPages: Math.ceil(result.count / limit),
    },
  };
}

async function getById(id) {
  const user = await repository.findById(id);
  if (!user) throw ErrorApi.notFound('کاربر مورد نظر پیدا نشد');
  return toPublicUser(user);
}

async function create(data) {
  security.validatePassword(data.password, await security.getSettings());

  const passwordHash = await hashPassword(data.password);
  const user = await repository.create({
    username: data.username,
    passwordHash,
    phone: normalizePhone(data.phone),
    isactive: data.isactive,
  });

  return toPublicUser(user);
}

async function update(id, data, meta = {}) {
  const currentUser = await repository.findById(id);
  if (!currentUser) throw ErrorApi.notFound('کاربر مورد نظر پیدا نشد');

  const updateData = { ...data };
  const passwordChanged = Object.hasOwn(updateData, 'password');
  if (passwordChanged) {
    security.validatePassword(updateData.password, await security.getSettings());
    updateData.passwordHash = await hashPassword(updateData.password);
    delete updateData.password;
  }

  if (Object.hasOwn(updateData, 'phone')) {
    updateData.phone = normalizePhone(updateData.phone);
  }

  const activeStatusChanged = Object.hasOwn(updateData, 'isactive')
    && Number(updateData.isactive) !== Number(currentUser.isactive);

  const updatedUser = await sequelize.transaction(async (transaction) => {
    const user = await repository.updateById(id, updateData, { transaction });
    if (!user) throw ErrorApi.notFound('کاربر مورد نظر پیدا نشد');

    if (passwordChanged || activeStatusChanged) {
      await RefreshSession.update({ revokedAt: new Date() }, {
        where: { user_id: id, revokedAt: null },
        transaction,
      });
    }

    return user;
  });

  if (passwordChanged) await security.recordEvent({ eventType: 'ADMIN_PASSWORD_RESET', userId: id, username: updatedUser.username, ipAddress: meta.ipAddress, userAgent: meta.userAgent, details: `تغییر توسط مدیر ${meta.actorUsername || ''}` });
  if (activeStatusChanged && Number(updatedUser.isactive) !== 1) await security.recordEvent({ eventType: 'USER_DISABLED', userId: id, username: updatedUser.username, ipAddress: meta.ipAddress, userAgent: meta.userAgent, details: `غیرفعال‌سازی توسط مدیر ${meta.actorUsername || ''}` });

  return toPublicUser(updatedUser);
}

async function assignRole(userId, roleId, meta = {}) {
  const result = await sequelize.transaction(async (transaction) => {
    const user = await repository.findById(userId, { transaction });
    if (!user) throw ErrorApi.notFound('کاربر مورد نظر پیدا نشد');

    const role = await repository.findRoleById(roleId, { transaction });
    if (!role) throw ErrorApi.notFound('نقش مورد نظر پیدا نشد');

    await repository.assignRole(userId, roleId, { transaction });

    const result = {
      user: { id: user.id, username: user.username },
      role: { id: role.id, name: role.name },
    };
    return result;
  });
  await security.recordEvent({
    eventType: 'USER_ROLE_CHANGED',
    userId,
    username: result.user.username,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    details: `نقش به «${result.role.name}» تغییر کرد؛ توسط مدیر ${meta.actorUsername || ''}`,
  });
  return result;
}

module.exports = { list, getById, create, update, assignRole };
