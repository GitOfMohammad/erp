const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../../app');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const env = require('../../core/config/env');

test('shipment API paginates and transfers stock exactly once on delivery', { timeout: 60000 }, async () => {
  await sequelize.authenticate();
  const suffix = crypto.randomUUID();
  const username = `shipment-${suffix}`;
  const password = 'Local-shipment-Password-123';
  const made = { user: null, role: null, partner: null, product: null, warehouses: [], shipmentIds: [], server: null, permissionsCreated: [] };

  try {
    const permissionCodes = ['scm.shipments.read', 'scm.shipments.create', 'scm.shipments.pickup', 'scm.shipments.transit', 'scm.shipments.deliver'];
    const permissions = [];
    const catalog = require('../../modules/auth/permissions/permissions.catalog');
    for (const code of permissionCodes) {
      let permission = await models.Permission.findOne({ where: { code } });
      if (!permission) {
        permission = await models.Permission.create(catalog.find(item => item.code === code));
        made.permissionsCreated.push(permission.id);
      }
      permissions.push(permission);
    }
    made.role = await models.Role.create({ name: `Shipment integration ${suffix}` });
    await made.role.setPermissions(permissions);
    made.user = await models.User.create({ username, passwordHash: await hashPassword(password), isactive: 1 });
    await models.UserRole.create({ user_id: made.user.id, role_id: made.role.id });
    made.partner = await models.CommercialPartner.create({ code: `S-${suffix.slice(0, 30)}`, name: 'Shipment integration partner', partner_type: 'BOTH', is_active: 1 });
    made.product = await models.Product.create({ code: `S-${suffix}`, name: 'Shipment integration item', unit: 'piece', reorder_point: 0, is_active: 1 });
    const source = await models.Warehouse.create({ code: `SS-${suffix.slice(0, 28)}`, name: 'Shipment source', is_active: 1 });
    const destination = await models.Warehouse.create({ code: `SD-${suffix.slice(0, 28)}`, name: 'Shipment destination', is_active: 1 });
    made.warehouses.push(source, destination);
    await models.StockBalance.create({ product_id: made.product.id, warehouse_id: source.id, quantity: '5.000', avg_unit_cost: '1000', reorder_point: null });

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
    for (let index = 1; index <= 2; index++) {
      const shipment = await request('/scm/shipments', {
        method: 'POST', token, expectStatus: 201,
        body: {
          shipment_number: `SHIP-${suffix.slice(0, 12)}-${index}`,
          direction: 'OUTBOUND', partner_id: made.partner.id, document_id: null,
          source_warehouse_id: source.id, destination_warehouse_id: destination.id,
          carrier: 'Integration carrier', tracking_number: `${index}`,
          items: [{ product_id: made.product.id, quantity: '1.000' }],
        },
      });
      made.shipmentIds.push(shipment.id);
    }

    const firstPage = await request('/scm/shipments?page=1&limit=1', { token });
    assert.equal(firstPage.items.length, 1);
    assert.equal(firstPage.pagination.limit, 1);
    assert.ok(firstPage.pagination.totalItems >= 2);
    assert.ok(firstPage.pagination.totalPages >= 2);
    const secondPage = await request('/scm/shipments?page=2&limit=1', { token });
    assert.equal(secondPage.items.length, 1);
    assert.notEqual(firstPage.items[0].id, secondPage.items[0].id);

    const shipmentId = made.shipmentIds[0];
    await request(`/scm/shipments/${shipmentId}/actions/pickup`, { method: 'POST', token });
    await request(`/scm/shipments/${shipmentId}/actions/transit`, { method: 'POST', token });
    const delivered = await request(`/scm/shipments/${shipmentId}/actions/deliver`, { method: 'POST', token });
    assert.equal(delivered.status, 'DELIVERED');
    const sourceBalance = await models.StockBalance.findOne({ where: { product_id: made.product.id, warehouse_id: source.id } });
    const destinationBalance = await models.StockBalance.findOne({ where: { product_id: made.product.id, warehouse_id: destination.id } });
    assert.equal(String(sourceBalance.quantity), '4.000');
    assert.equal(String(destinationBalance.quantity), '1.000');
    const movements = await models.StockMovement.count({ where: { source_type: 'SCM_SHIPMENT', source_id: shipmentId } });
    assert.equal(movements, 2, 'delivery writes one outbound and one inbound movement');
  } finally {
    if (made.server) await new Promise(resolve => made.server.close(resolve));
    if (made.shipmentIds.length) {
      await models.StockMovement.destroy({ where: { source_type: 'SCM_SHIPMENT', source_id: made.shipmentIds } });
      await models.ScmShipmentItem.destroy({ where: { shipment_id: made.shipmentIds } });
      await models.ScmShipment.destroy({ where: { id: made.shipmentIds } });
    }
    if (made.product) {
      await models.StockBalance.destroy({ where: { product_id: made.product.id } });
      await models.Product.destroy({ where: { id: made.product.id }, force: true });
    }
    if (made.warehouses.length) await models.Warehouse.destroy({ where: { id: made.warehouses.map(row => row.id) } });
    if (made.partner) await models.CommercialPartner.destroy({ where: { id: made.partner.id }, force: true });
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
