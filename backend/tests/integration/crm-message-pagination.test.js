const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const crm = require('../../modules/crm/crm.service');

test('support ticket messages are returned newest-first in bounded pages', { timeout: 60000 }, async () => {
  await sequelize.authenticate();
  const suffix = crypto.randomUUID();
  let user; let partner; let ticket;
  const messageIds = [];
  try {
    user = await models.User.create({ username: `crm-page-${suffix}`, passwordHash: 'integration', isactive: 1 });
    partner = await models.CommercialPartner.create({ code: `CP-${suffix}`, name: 'CRM page integration', partner_type: 'CUSTOMER', is_active: 1 });
    ticket = await models.CrmSupportTicket.create({ ticket_number: `TKT-${suffix}`, partner_id: partner.id, subject: 'Message paging', description: 'Temporary pagination test', created_by: user.id });
    for (let index = 0; index < 3; index += 1) {
      const message = await models.CrmSupportMessage.create({ ticket_id: ticket.id, author_id: user.id, body: `message-${index + 1}`, is_internal: 0 });
      messageIds.push(message.id);
    }

    const first = await crm.listMessages(ticket.id, { page: 1, limit: 2 });
    const second = await crm.listMessages(ticket.id, { page: 2, limit: 2 });
    assert.equal(first.items.length, 2);
    assert.equal(first.pagination.totalItems, 3);
    assert.equal(first.pagination.totalPages, 2);
    assert.equal(second.items.length, 1);
    assert.equal(second.pagination.page, 2);
    assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 3);
  } finally {
    if (ticket) await models.CrmSupportMessage.destroy({ where: { ticket_id: ticket.id } });
    if (ticket) await ticket.destroy();
    if (partner) await models.CommercialPartner.destroy({ where: { id: partner.id }, force: true });
    if (user) await user.destroy();
    await sequelize.close();
  }
});
