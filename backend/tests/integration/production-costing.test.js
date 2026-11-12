const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../../app');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const env = require('../../core/config/env');

test('production flow transfers material and accrued costs through WIP into inventory and scrap', { timeout: 60000 }, async () => {
  await sequelize.authenticate();
  const suffix = crypto.randomUUID();
  const username = `production-${suffix}`;
  const password = 'Local-production-Password-123';
  const grantedPermissions = [
    'production.boms.create', 'production.boms.activate',
    'production.orders.create', 'production.orders.release', 'production.orders.cost', 'production.orders.complete',
    'production.quality.create',
  ];
  const made = { role: null, user: null, materials: null, finished: null, warehouse: null, bomId: null, orderId: null, costId: null, server: null };

  try {
    const permissions = await models.Permission.findAll({ where: { code: grantedPermissions } });
    assert.equal(permissions.length, grantedPermissions.length, 'permission catalog must be seeded before integration tests');
    made.role = await models.Role.create({ name: `Production integration ${suffix}` });
    await made.role.setPermissions(permissions);
    made.user = await models.User.create({ username, passwordHash: await hashPassword(password), isactive: 1 });
    await models.UserRole.create({ user_id: made.user.id, role_id: made.role.id });

    made.materials = await models.Product.create({ code: `M${suffix.slice(0, 4)}`, name: `Test material ${suffix}`, unit: 'عدد', is_active: 1 });
    made.finished = await models.Product.create({ code: `F${suffix.slice(0, 4)}`, name: `Test finished ${suffix}`, unit: 'عدد', is_active: 1 });
    made.warehouse = await models.Warehouse.create({ code: `W${suffix.slice(0, 4)}`, name: `Test production ${suffix}`, is_active: 1 });
    await models.StockBalance.create({ warehouse_id: made.warehouse.id, product_id: made.materials.id, quantity: '10.000', avg_unit_cost: '100', reorder_point: '0.000' });

    made.server = app.listen(0);
    await new Promise((resolve, reject) => { made.server.once('listening', resolve); made.server.once('error', reject); });
    const baseUrl = `http://127.0.0.1:${made.server.address().port}${env.api.prefix}`;
    async function request(path, { method = 'GET', body, token } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await response.json();
      assert.ok(response.ok, `${method} ${path} failed (${response.status}): ${json.message || JSON.stringify(json)}${json.stack ? `\n${json.stack}` : ''}`);
      return json.details;
    }

    const login = await request('/auth/login', { method: 'POST', body: { username, password } });
    const token = login.tokens.accessToken;
    const bom = await request('/production/boms', { method: 'POST', token, body: { product_id: made.finished.id, output_quantity: '1', version: 1 } });
    made.bomId = bom.id;
    await request('/production/bom-items', { method: 'POST', token, body: { bom_id: bom.id, product_id: made.materials.id, quantity: '2', waste_percent: 0 } });
    assert.equal(await models.ProductionOrder.count({ where: { created_by: made.user.id } }), 0, 'adding a formula item must not create a production order');
    await request(`/production/boms/${bom.id}/actions/activate`, { method: 'POST', token });

    const order = await request('/production/orders', { method: 'POST', token, body: { bom_id: bom.id, product_id: made.finished.id, warehouse_id: made.warehouse.id, planned_quantity: '2' } });
    made.orderId = order.id;
    await request(`/production/orders/${order.id}/actions/release`, { method: 'POST', token });
    const materialBalance = await models.StockBalance.findOne({ where: { warehouse_id: made.warehouse.id, product_id: made.materials.id } });
    assert.equal(String(materialBalance.quantity), '6.000');
    const materialSnapshot = await models.ProductionOrderMaterial.findOne({ where: { order_id: order.id, product_id: made.materials.id } });
    assert.equal(String(materialSnapshot.unit_cost), '100');

    const cost = await request(`/production/orders/${order.id}/costs`, { method: 'POST', token, body: { cost_type: 'LABOR', cost_date: new Date().toISOString().slice(0, 10), description: 'integration labor', amount: '100' } });
    made.costId = cost.cost.id;
    const wagesPayable = await models.FinancialAccount.findOne({ where: { name: 'حقوق پرداختنی', account_type: 'LIABILITY', is_active: 1, is_postable: 1 } });
    assert.ok(wagesPayable, 'the default chart must include a postable wages payable account');
    const laborPayableLine = await models.JournalLine.findOne({ where: { journal_entry_id: cost.journalEntry.id, account_id: wagesPayable.id } });
    assert.equal(String(laborPayableLine?.credit), '100', 'direct labor accrual credits wages payable, not trade accounts payable');
    await request('/production/quality-checks', { method: 'POST', token, body: { order_id: order.id, product_id: made.finished.id, inspected_quantity: '2', passed_quantity: '1.5', failed_quantity: '0.5', result: 'PARTIAL', notes: 'integration quality' } });
    await request(`/production/orders/${order.id}/actions/complete`, { method: 'POST', token });

    const finishedBalance = await models.StockBalance.findOne({ where: { warehouse_id: made.warehouse.id, product_id: made.finished.id } });
    assert.equal(String(finishedBalance.quantity), '1.500');
    assert.equal(String(finishedBalance.avg_unit_cost), '250');
    const entries = await models.JournalEntry.findAll({ where: { created_by: made.user.id, source_type: ['PRODUCTION_ISSUE', 'PRODUCTION_ORDER_COST', 'PRODUCTION_COMPLETE'] }, include: [{ model: models.JournalLine, as: 'lines' }] });
    assert.equal(entries.length, 3);
    for (const entry of entries) {
      const debit = entry.lines.reduce((sum, line) => sum + BigInt(line.debit), 0n);
      const credit = entry.lines.reduce((sum, line) => sum + BigInt(line.credit), 0n);
      assert.equal(debit, credit, `${entry.source_type} journal must balance`);
    }
    const totals = entries.flatMap(entry => entry.lines).reduce((sum, line) => sum + BigInt(line.debit) - BigInt(line.credit), 0n);
    assert.equal(totals, 0n, 'production must transfer the full WIP amount into finished goods and scrap');
  } finally {
    if (made.server) await new Promise(resolve => made.server.close(resolve));
    if (made.user) {
      const { Op } = require('sequelize');
      const productionEntries = await models.JournalEntry.findAll({ where: { created_by: made.user.id, source_type: { [Op.in]: ['PRODUCTION_ISSUE', 'PRODUCTION_ORDER_COST', 'PRODUCTION_COMPLETE'] } }, attributes: ['id'] });
      const entryIds = productionEntries.map(entry => entry.id);
      if (made.costId) await models.ProductionOrderCost.destroy({ where: { id: made.costId } });
      if (made.orderId) {
        await models.ProductionQualityCheck.destroy({ where: { order_id: made.orderId } });
        await models.ProductionOrderMaterial.destroy({ where: { order_id: made.orderId } });
        await models.StockMovement.destroy({ where: { source_id: made.orderId, source_type: 'PRODUCTION' } });
      }
      if (entryIds.length) {
        await models.JournalLine.destroy({ where: { journal_entry_id: entryIds } });
        await models.JournalEntry.destroy({ where: { id: entryIds } });
      }
      if (made.orderId) await models.ProductionOrder.destroy({ where: { id: made.orderId } });
      if (made.bomId) {
        await models.ProductionBomItem.destroy({ where: { bom_id: made.bomId } });
        await models.ProductionBom.destroy({ where: { id: made.bomId } });
      }
      if (made.warehouse && made.materials) await models.StockBalance.destroy({ where: { warehouse_id: made.warehouse.id, product_id: made.materials.id } });
      if (made.warehouse && made.finished) await models.StockBalance.destroy({ where: { warehouse_id: made.warehouse.id, product_id: made.finished.id } });
      if (made.warehouse) await models.Warehouse.destroy({ where: { id: made.warehouse.id } });
      if (made.materials) await models.Product.destroy({ where: { id: made.materials.id }, force: true });
      if (made.finished) await models.Product.destroy({ where: { id: made.finished.id }, force: true });
      const refreshSessions = await models.RefreshSession.destroy({ where: { user_id: made.user.id } });
      void refreshSessions;
      await models.UserRole.destroy({ where: { user_id: made.user.id } });
      if (made.role) {
        await models.RolePermission.destroy({ where: { role_id: made.role.id } });
        await made.role.destroy();
      }
      await made.user.destroy();
    }
  }
});
