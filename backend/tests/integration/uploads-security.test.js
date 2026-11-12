const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = require('../../app');
const env = require('../../core/config/env');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { signAccessToken } = require('../../core/utils/jwt');

test('images remain public while contract PDFs require authentication and permission', { timeout: 30000 }, async () => {
  await sequelize.authenticate();

  const suffix = crypto.randomUUID();
  const pdfName = crypto.randomUUID() + '.pdf';
  const imageName = crypto.randomUUID() + '.png';
  const pdfPath = path.join(env.uploads.directory, 'pdfs', pdfName);
  const imagePath = path.join(env.uploads.directory, 'images', imageName);
  const made = { user: null, role: null, partner: null, contract: null, session: null, deniedUser: null, deniedRole: null, deniedSession: null };
  let server;

  try {
    await fs.mkdir(path.dirname(pdfPath), { recursive: true });
    await fs.mkdir(path.dirname(imagePath), { recursive: true });
    await fs.writeFile(pdfPath, Buffer.from('%PDF-1.4 integration private contract'));
    await fs.writeFile(imagePath, Buffer.from('public integration image'));

    made.user = await models.User.create({
      username: 'upload-security-' + suffix,
      passwordHash: 'not-used-by-this-test',
      isactive: 1,
    });
    made.role = await models.Role.create({ name: 'Upload security ' + suffix });
    const permission = await models.Permission.findOne({ where: { code: 'crm.contracts.read' } });
    assert.ok(permission, 'Permission seeder must run before integration tests');
    await made.role.setPermissions([permission]);
    await models.UserRole.create({ user_id: made.user.id, role_id: made.role.id });

    const refreshToken = crypto.randomBytes(32).toString('hex');
    made.session = await models.RefreshSession.create({
      user_id: made.user.id,
      tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      revokedAt: null,
    });
    const accessToken = signAccessToken({ sub: made.user.id, sid: made.session.id });

    made.deniedUser = await models.User.create({
      username: 'upload-denied-' + suffix,
      passwordHash: 'not-used-by-this-test',
      isactive: 1,
    });
    made.deniedRole = await models.Role.create({ name: 'Upload denied ' + suffix });
    const unrelatedPermission = await models.Permission.findOne({ where: { code: 'users.read' } });
    assert.ok(unrelatedPermission, 'Permission seeder must run before integration tests');
    await made.deniedRole.setPermissions([unrelatedPermission]);
    await models.UserRole.create({ user_id: made.deniedUser.id, role_id: made.deniedRole.id });
    made.deniedSession = await models.RefreshSession.create({
      user_id: made.deniedUser.id,
      tokenHash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      revokedAt: null,
    });
    const deniedToken = signAccessToken({ sub: made.deniedUser.id, sid: made.deniedSession.id });

    made.partner = await models.CommercialPartner.create({
      code: 'U-' + suffix.slice(0, 30),
      name: 'Upload security partner',
      partner_type: 'CUSTOMER',
      is_active: 1,
    });
    made.contract = await models.CrmContract.create({
      contract_number: 'U-' + suffix,
      partner_id: made.partner.id,
      title: 'Private contract fixture',
      contract_type: 'OTHER',
      start_date: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      file_path: 'pdfs/' + pdfName,
      created_by: made.user.id,
    });

    server = app.listen(0);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const base = 'http://127.0.0.1:' + server.address().port;

    const imageResponse = await fetch(base + '/uploads/images/' + imageName);
    assert.equal(imageResponse.status, 200);
    assert.equal(await imageResponse.text(), 'public integration image');

    const publicPdfResponse = await fetch(base + '/uploads/pdfs/' + pdfName);
    assert.equal(publicPdfResponse.status, 404);

    const unauthorized = await fetch(base + env.api.prefix + '/crm/contracts/' + made.contract.id + '/file');
    assert.equal(unauthorized.status, 401);

    const forbidden = await fetch(base + env.api.prefix + '/crm/contracts/' + made.contract.id + '/file', {
      headers: { authorization: 'Bearer ' + deniedToken },
    });
    assert.equal(forbidden.status, 403);

    const authorized = await fetch(base + env.api.prefix + '/crm/contracts/' + made.contract.id + '/file', {
      headers: { authorization: 'Bearer ' + accessToken },
    });
    assert.equal(authorized.status, 200);
    assert.match(authorized.headers.get('content-type'), /application\/pdf/);
    assert.equal(await authorized.text(), '%PDF-1.4 integration private contract');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    try {
      if (made.contract) await models.CrmContract.destroy({ where: { id: made.contract.id } });
      if (made.partner) await models.CommercialPartner.destroy({ where: { id: made.partner.id }, force: true });
      if (made.user) {
        await models.RefreshSession.destroy({ where: { user_id: made.user.id } });
        await models.UserRole.destroy({ where: { user_id: made.user.id } });
        if (made.role) {
          await models.RolePermission.destroy({ where: { role_id: made.role.id } });
          await models.Role.destroy({ where: { id: made.role.id } });
        }
        if (made.deniedUser) {
          await models.RefreshSession.destroy({ where: { user_id: made.deniedUser.id } });
          await models.UserRole.destroy({ where: { user_id: made.deniedUser.id } });
          if (made.deniedRole) {
            await models.RolePermission.destroy({ where: { role_id: made.deniedRole.id } });
            await models.Role.destroy({ where: { id: made.deniedRole.id } });
          }
          await models.User.destroy({ where: { id: made.deniedUser.id } });
        }
        await models.User.destroy({ where: { id: made.user.id } });
      }
    } finally {
      await fs.unlink(pdfPath).catch(() => {});
      await fs.unlink(imagePath).catch(() => {});
      await sequelize.close();
    }
  }
});