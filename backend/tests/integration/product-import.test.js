const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../../app');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const env = require('../../core/config/env');

test('product Excel import previews valid and invalid rows, then stores only after the commit request', { timeout: 60000 }, async () => {
  await sequelize.authenticate();
  const suffix = crypto.randomUUID();
  const username = `product-import-${suffix}`;
  const password = 'Local-import-Password-123';
  const barcode = `IMP${suffix.slice(0, 12)}`;
  const made = { role: null, user: null, category: null, productIds: [], server: null };

  try {
    const codes = ['products.read', 'products.create'];
    const permissions = await models.Permission.findAll({ where: { code: codes } });
    assert.equal(permissions.length, codes.length, 'product permissions must be seeded before integration tests');
    made.role = await models.Role.create({ name: `Product import integration ${suffix}` });
    await made.role.setPermissions(permissions);
    made.user = await models.User.create({ username, passwordHash: await hashPassword(password), isactive: 1 });
    await models.UserRole.create({ user_id: made.user.id, role_id: made.role.id });
    made.category = await models.Category.create({ name: `Import category ${suffix}`, is_active: 1 });

    made.server = app.listen(0);
    await new Promise((resolve, reject) => { made.server.once('listening', resolve); made.server.once('error', reject); });
    const baseUrl = `http://127.0.0.1:${made.server.address().port}${env.api.prefix}`;
    async function request(path, { method = 'GET', body, token, expectStatus = 200 } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await response.json();
      assert.equal(response.status, expectStatus, `${method} ${path} returned ${response.status}: ${json.message || JSON.stringify(json)}`);
      return json.details;
    }

    const login = await request('/auth/login', { method: 'POST', body: { username, password } });
    const token = login.tokens.accessToken;
    const rows = [
      { rowNumber: 2, name: 'کالای وارداتی آزمایشی', unit: 'عدد', sale_price: '125000', tax_type: 'OFFICIAL', barcode, categoryNames: [made.category.name] },
      { rowNumber: 3, name: '', sale_price: '9000', tax_type: 'UNOFFICIAL', barcode: `${barcode}-bad` },
    ];
    const preview = await request('/products/import/preview', { method: 'POST', token, body: { rows } });
    assert.equal(preview.totalRows, 2);
    assert.equal(preview.valid.length, 1);
    assert.equal(preview.invalid.length, 1);
    assert.equal(preview.invalid[0].rowNumber, 3);
    assert.equal(await models.Product.count({ where: { barcode } }), 0, 'preview must not write products');

    const imported = await request('/products/import', { method: 'POST', token, body: { rows: preview.valid.map(item => item.data) }, expectStatus: 201 });
    made.productIds = imported.products.map(product => product.id);
    assert.equal(imported.createdCount, 1);
    const product = await models.Product.findByPk(made.productIds[0], { include: [{ model: models.Category, as: 'categories' }] });
    assert.ok(product);
    assert.equal(product.barcode, barcode);
    assert.equal(product.categories[0].id, made.category.id);
    assert.match(product.code, /^\d{5}$/);

    await request('/products/import', { method: 'POST', token, body: { rows: [rows[0], { ...rows[0], name: 'ردیف با بارکد تکراری' }] }, expectStatus: 400 });
    assert.equal(await models.Product.count({ where: { barcode } }), 1, 'a rejected batch must not partially import');
  } finally {
    if (made.server) await new Promise(resolve => made.server.close(resolve));
    if (made.productIds.length) await models.ProductCategory.destroy({ where: { product_id: made.productIds } });
    if (made.productIds.length) await models.Product.destroy({ where: { id: made.productIds }, force: true });
    if (made.category) await made.category.destroy();
    if (made.user) {
      await models.RefreshSession.destroy({ where: { user_id: made.user.id } });
      await models.UserRole.destroy({ where: { user_id: made.user.id } });
    }
    if (made.role) {
      await models.RolePermission.destroy({ where: { role_id: made.role.id } });
      await made.role.destroy();
    }
    if (made.user) await made.user.destroy();
    await sequelize.close();
  }
});
