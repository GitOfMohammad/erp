const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../../app');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const env = require('../../core/config/env');
const permissionCatalog = require('../../modules/auth/permissions/permissions.catalog');
const normalizeJson = (row, fields) => {
  if (!row) return null;
  const value = { ...row };
  for (const field of fields) {
    let parsed = value[field];
    for (let attempt = 0; attempt < 5 && typeof parsed === 'string'; attempt += 1) {
      try { parsed = JSON.parse(parsed); } catch { break; }
    }
    value[field] = parsed;
  }
  return value;
};

test('print defaults and Moadian settings persist through authenticated settings API', { timeout: 60000 }, async () => {
  await sequelize.authenticate();
  const suffix = crypto.randomUUID();
  const username = `print-settings-${suffix}`;
  const password = 'Local-print-Password-123';
  const made = { user: null, role: null, server: null, permissionsCreated: [], originalPrint: null, originalMoadian: null, originalGeneral: null, originalFinance: null };
  for (const [key, Model] of [['originalPrint', models.PrintSetting], ['originalMoadian', models.MoadianSetting], ['originalGeneral', models.CompanySetting], ['originalFinance', models.FinanceSetting]]) {
    const row = await Model.findByPk(1);
    const value = row ? row.get({ plain: true }) : null;
    const jsonFields = key === 'originalPrint' ? ['printOptions', 'templates', 'defaults']
      : key === 'originalGeneral' ? ['phoneNumbers', 'mobileNumbers', 'departmentEmails', 'socialAccounts', 'addresses']
        : key === 'originalFinance' ? ['enabledCurrencies'] : [];
    made[key] = normalizeJson(value, jsonFields);
  }

  try {
    const permissionCodes = ['settings.general.read', 'settings.general.update', 'settings.tax.read', 'settings.tax.update', 'settings.finance.read', 'settings.finance.update'];
    const permissions = [];
    for (const code of permissionCodes) {
      let permission = await models.Permission.findOne({ where: { code } });
      if (!permission) {
        permission = await models.Permission.create(permissionCatalog.find(item => item.code === code));
        made.permissionsCreated.push(permission.id);
      }
      permissions.push(permission);
    }
    made.role = await models.Role.create({ name: `Print settings integration ${suffix}` });
    await made.role.setPermissions(permissions);
    made.user = await models.User.create({ username, passwordHash: await hashPassword(password), isactive: 1 });
    await models.UserRole.create({ user_id: made.user.id, role_id: made.role.id });
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
      assert.equal(response.status, expectStatus, `${method} ${path} returned ${response.status}: ${JSON.stringify(json)}`);
      return json.details;
    }

    const login = await request('/auth/login', { method: 'POST', body: { username, password } });
    const token = login.tokens.accessToken;
    const general = await request('/settings/general', { token });
    const savedGeneral = await request('/settings/general', {
      method: 'PUT', token, expectStatus: 200,
      body: { ...general, displayName: 'تنظیمات آزمایشی', phoneNumbers: [{ label: 'دفتر', number: '02100000000' }], addresses: [{ label: 'مرکزی', city: 'تهران', address: 'آدرس آزمایشی' }] },
    });
    assert.equal(savedGeneral.displayName, 'تنظیمات آزمایشی');
    assert.deepEqual(savedGeneral.phoneNumbers, [{ label: 'دفتر', number: '02100000000', extension: null }]);
    assert.equal(savedGeneral.addresses[0].city, 'تهران');
    const finance = await request('/settings/finance', { token });
    const savedFinance = await request('/settings/finance', {
      method: 'PUT', token, expectStatus: 200,
      body: { ...finance, enabledCurrencies: ['EUR'] },
    });
    assert.deepEqual(savedFinance.enabledCurrencies, ['EUR']);
    const activeCurrencies = await request('/settings/finance/currencies', { token });
    assert.deepEqual(activeCurrencies.currencies, ['IRR', 'EUR']);
    const printDefaults = await request('/settings/print', { token });
    assert.ok(Array.isArray(printDefaults.templates) && printDefaults.templates.length >= 1);
    assert.ok(printDefaults.templates.every(template => Array.isArray(template.elements)));
    const defaultSales = await request('/settings/print/default/%D9%81%D8%B1%D9%88%D8%B4', { token });
    assert.equal(defaultSales.template.id, printDefaults.defaults['فروش']);
    assert.ok(defaultSales.template.elements.some(element => element.type === 'totals'));

    const savedPrint = await request('/settings/print', {
      method: 'PUT', token, expectStatus: 200,
      body: { ...printDefaults, printOptions: { ...printDefaults.printOptions, orientation: 'landscape' } },
    });
    assert.equal(savedPrint.printOptions.orientation, 'landscape');
    const moadian = await request('/settings/moadian', { token });
    const savedMoadian = await request('/settings/moadian', {
      method: 'PUT', token, expectStatus: 200,
      body: { environment: 'sandbox', deliveryMode: 'direct', fiscalMemoryId: `TEST-${suffix.slice(0, 16)}`, intermediaryName: null },
    });
    assert.equal(savedMoadian.environment, 'sandbox');
    assert.equal(savedMoadian.deliveryMode, 'direct');
    assert.match(savedMoadian.fiscalMemoryId, /^TEST-/);
    assert.equal(moadian.environment, 'sandbox');
  } finally {
    if (made.server) await new Promise(resolve => made.server.close(resolve));
    if (made.originalPrint) await models.PrintSetting.upsert(made.originalPrint);
    else await models.PrintSetting.destroy({ where: { id: 1 } });
    if (made.originalMoadian) await models.MoadianSetting.upsert(made.originalMoadian);
    else await models.MoadianSetting.destroy({ where: { id: 1 } });
    if (made.originalGeneral) await models.CompanySetting.upsert(made.originalGeneral);
    else await models.CompanySetting.destroy({ where: { id: 1 } });
    if (made.originalFinance) await models.FinanceSetting.upsert(made.originalFinance);
    else await models.FinanceSetting.destroy({ where: { id: 1 } });
    if (made.user) {
      await models.RefreshSession.destroy({ where: { user_id: made.user.id } });
      await models.UserRole.destroy({ where: { user_id: made.user.id } });
    }
    if (made.role) {
      await models.RolePermission.destroy({ where: { role_id: made.role.id } });
      await made.role.destroy();
    }
    if (made.permissionsCreated.length) await models.Permission.destroy({ where: { id: made.permissionsCreated } });
    if (made.user) await made.user.destroy();
    await sequelize.close();
  }
});
