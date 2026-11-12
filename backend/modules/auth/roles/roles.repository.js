const { Op } = require('sequelize');
const { Role, Permission } = require('../../../core/database/models');
const { sequelize } = require('../../../core/database/db');

const permissionInclude = {
  model: Permission,
  as: 'permissions',
  through: { attributes: [] },
};

function findAll({ limit, offset, search }) {
  const where = search
    ? { name: { [Op.like]: `%${search}%` } }
    : undefined;

  return Role.findAndCountAll({
    where,
    include: [permissionInclude],
    distinct: true,
    limit,
    offset,
    order: [['name', 'ASC']],
  });
}

function findById(id, options = {}) {
  return Role.findByPk(id, { ...options, include: [permissionInclude] });
}

function findPermissionsByCodes(codes) {
  return Permission.findAll({ where: { code: { [Op.in]: codes } } });
}

function create(data) {
  return Role.create(data);
}

async function updateById(id, data) {
  const role = await Role.findByPk(id);
  if (!role) return null;
  await role.update(data);
  return findById(id);
}

async function deleteById(id) {
  const role = await Role.findByPk(id);
  if (!role) return null;
  await role.destroy();
  return role;
}

async function replacePermissions(roleId, permissions) {
  return sequelize.transaction(async (transaction) => {
    const role = await Role.findByPk(roleId, { transaction });
    if (!role) return null;

    await role.setPermissions(permissions, { transaction });
    return findById(roleId, { transaction });
  });
}

module.exports = {
  findAll,
  findById,
  findPermissionsByCodes,
  create,
  updateById,
  deleteById,
  replacePermissions,
};

