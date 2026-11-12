const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../../app');
const { sequelize } = require('../../core/database/db');
const { User, Role, Permission, UserRole, RefreshSession } = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const env = require('../../core/config/env');

test('auth flow rotates refresh tokens, assigns a user role, and revokes a session on logout', async () => {
  await sequelize.authenticate();

  const suffix = crypto.randomUUID();
  const username = `integration-${suffix}`;
  const password = 'Local-integration-Password-123';
  const roles = [];
  const users = [];
  let server;

  try {
    const [roleUpdatePermission, usersReadPermission] = await Promise.all([
      Permission.findOne({ where: { code: 'users.role.update' } }),
      Permission.findOne({ where: { code: 'users.read' } }),
    ]);
    assert.ok(roleUpdatePermission, 'Permission seeder must run before integration tests');
    assert.ok(usersReadPermission, 'Permission seeder must run before integration tests');

    const managerRole = await Role.create({ name: `Integration manager ${suffix}` });
    const assignedRole = await Role.create({ name: `Integration assigned ${suffix}` });
    roles.push(managerRole, assignedRole);
    await managerRole.setPermissions([roleUpdatePermission, usersReadPermission]);

    const passwordHash = await hashPassword(password);
    const manager = await User.create({ username, passwordHash, isactive: 1 });
    const target = await User.create({ username: `${username}-target`, passwordHash, isactive: 1 });
    users.push(manager, target);
    await UserRole.create({ user_id: manager.id, role_id: managerRole.id });
    await UserRole.create({ user_id: target.id, role_id: managerRole.id });

    server = app.listen(0);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}${env.api.prefix}`;

    async function request(path, { method = 'GET', body, token } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, json: await response.json() };
    }

    const login = await request('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    assert.equal(login.status, 200);
    const firstTokens = login.json.details.tokens;
    assert.ok(firstTokens.accessToken);
    assert.ok(firstTokens.refreshToken);

    const refresh = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: firstTokens.refreshToken },
    });
    assert.equal(refresh.status, 200);
    const rotatedTokens = refresh.json.details.tokens;
    assert.notEqual(rotatedTokens.refreshToken, firstTokens.refreshToken);

    const reusedRefresh = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: firstTokens.refreshToken },
    });
    assert.equal(reusedRefresh.status, 401);

    const assignment = await request(`/users/${target.id}/role`, {
      method: 'PUT',
      body: { roleId: assignedRole.id },
      token: rotatedTokens.accessToken,
    });
    assert.equal(assignment.status, 200);
    assert.equal(assignment.json.details.role.id, assignedRole.id);

    const userDetails = await request(`/users/${target.id}`, { token: rotatedTokens.accessToken });
    assert.equal(userDetails.status, 200);
    assert.equal(userDetails.json.details.role.name, assignedRole.name);

    const logout = await request('/auth/logout', {
      method: 'POST',
      token: rotatedTokens.accessToken,
    });
    assert.equal(logout.status, 200);

    const afterLogout = await request('/auth/me', { token: rotatedTokens.accessToken });
    assert.equal(afterLogout.status, 401);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (users.length > 0) {
      const userIds = users.map(({ id }) => id);
      await RefreshSession.destroy({ where: { user_id: userIds } });
      await UserRole.destroy({ where: { user_id: userIds } });
      await User.destroy({ where: { id: userIds } });
    }
    if (roles.length > 0) {
      const roleIds = roles.map(({ id }) => id);
      await UserRole.destroy({ where: { role_id: roleIds } });
      await Role.destroy({ where: { id: roleIds } });
    }
    await sequelize.close();
  }
});
