require('../../config/env');

const { sequelize } = require('../db');
const { User, Role, Permission, UserRole } = require('../models');
const { hashPassword } = require('../../utils/bcrypt');
const permissionCatalog = require('../../../modules/auth/permissions/permissions.catalog');

const SITE_ADMIN_ROLE_NAME = 'مدیر سایت';
const SITE_ADMIN_ROLE_DESCRIPTION = 'نقش مدیر اولیه سامانه';

function readAdminUsername() {
  const username = process.env.INITIAL_ADMIN_USERNAME?.trim();
  if (!username || username.length < 2 || username.length > 100) {
    throw new Error('Set INITIAL_ADMIN_USERNAME (2 to 100 characters) before using the site administrator seeder.');
  }
  return username;
}

function readAdminCredentials() {
  const username = readAdminUsername();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password || [...password].length < 5 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 5 characters and at most 72 UTF-8 bytes.');
  }
  return { username, password };
}

module.exports = {
  async up() {
    const { username, password } = readAdminCredentials();
    const passwordHash = await hashPassword(password);

    await sequelize.transaction(async (transaction) => {
      const existingUser = await User.findOne({
        where: { username },
        attributes: ['id'],
        transaction,
      });
      if (existingUser) {
        throw new Error('The initial administrator username already exists. No existing account was changed.');
      }

      const existingRole = await Role.findOne({
        where: { name: SITE_ADMIN_ROLE_NAME },
        attributes: ['id'],
        transaction,
      });
      if (existingRole) {
        throw new Error('The site administrator role already exists. No existing role was changed.');
      }

      const permissionCodes = permissionCatalog.map(({ code }) => code);
      const permissions = await Permission.findAll({
        where: { code: permissionCodes },
        transaction,
      });
      const availableCodes = new Set(permissions.map(({ code }) => code));
      const missingCodes = permissionCodes.filter((code) => !availableCodes.has(code));
      if (missingCodes.length > 0) {
        throw new Error(`Seed permissions before the site administrator: ${missingCodes.join(', ')}`);
      }

      const role = await Role.create({
        name: SITE_ADMIN_ROLE_NAME,
        description: SITE_ADMIN_ROLE_DESCRIPTION,
      }, { transaction });
      const user = await User.create({
        username,
        passwordHash,
        isactive: 1,
      }, { transaction });

      await UserRole.create({ user_id: user.id, role_id: role.id }, { transaction });
      await role.setPermissions(permissions, { transaction });
    });
  },

  async down() {
    const username = readAdminUsername();

    await sequelize.transaction(async (transaction) => {
      const user = await User.findOne({ where: { username }, transaction });
      if (!user) return;

      const userRole = await UserRole.findOne({
        where: { user_id: user.id },
        include: [{ model: Role, as: 'role' }],
        transaction,
      });
      if (!userRole || userRole.role?.name !== SITE_ADMIN_ROLE_NAME) {
        throw new Error('Refusing to remove the account because it is no longer assigned to the initial site administrator role.');
      }

      const role = userRole.role;
      await userRole.destroy({ transaction });
      await user.destroy({ transaction });

      const remainingUsers = await UserRole.count({ where: { role_id: role.id }, transaction });
      if (remainingUsers === 0) {
        await role.setPermissions([], { transaction });
        await role.destroy({ transaction });
      }
    });
  },
};
