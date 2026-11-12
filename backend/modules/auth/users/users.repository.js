const { Op } = require('sequelize');
const { User, Role, UserRole } = require('../../../core/database/models');

const userRoleInclude = {
  model: UserRole,
  as: 'userRole',
  attributes: ['role_id'],
  required: false,
  include: [{
    model: Role,
    as: 'role',
    attributes: ['id', 'name'],
    required: false,
  }],
};

function findAll({ limit, offset, search }) {
  const where = search
    ? {
        [Op.or]: [
          { username: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      }
    : undefined;

  return User.findAndCountAll({
    where,
    limit,
    offset,
    include: [userRoleInclude],
    distinct: true,
    order: [['username', 'ASC']],
  });
}

function findById(id, options = {}) {
  return User.findByPk(id, { ...options, include: [userRoleInclude] });
}

function create(data) {
  return User.create(data);
}

async function updateById(id, data, options = {}) {
  const user = await User.findByPk(id, { transaction: options.transaction });
  if (!user) return null;
  await user.update(data, { transaction: options.transaction });
  return findById(id, { transaction: options.transaction });
}

function findRoleById(id, options = {}) {
  return Role.findByPk(id, options);
}

async function assignRole(userId, roleId, { transaction } = {}) {
  const userRole = await UserRole.findByPk(userId, {
    transaction,
    lock: transaction?.LOCK.UPDATE,
  });

  if (userRole) {
    await userRole.update({ role_id: roleId }, { transaction });
    return userRole;
  }

  return UserRole.create({ user_id: userId, role_id: roleId }, { transaction });
}

module.exports = {
  findAll,
  findById,
  findRoleById,
  create,
  updateById,
  assignRole,
};
