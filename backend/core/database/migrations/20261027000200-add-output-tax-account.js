'use strict';
const { randomUUID } = require('node:crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const [rows] = await queryInterface.sequelize.query('SELECT id, account_type FROM financial_accounts WHERE code = :code', { replacements: { code: '2100' } });
    if (rows.length && rows[0].account_type !== 'LIABILITY') throw new Error('نوع حساب ۲۱۰۰ باید بدهی باشد');
    if (rows.length) return;
    const accountId = randomUUID();
    await queryInterface.bulkInsert('financial_accounts', [{ id: accountId, code: '2100', name: 'مالیات پرداختنی فروش', account_type: 'LIABILITY', parent_id: null, is_system: 1, is_postable: 1, is_active: 1, created_at: now, updated_at: now }]);
    await queryInterface.bulkInsert('erp_domain_seeded_accounts', [{ code: '2100', account_id: accountId, created_at: now, updated_at: now }]);
  },
  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query('SELECT account_id FROM erp_domain_seeded_accounts WHERE code = :code', { replacements: { code: '2100' } });
    if (!rows.length) return;
    const [used] = await queryInterface.sequelize.query('SELECT COUNT(*) AS total FROM journal_lines WHERE account_id = :id', { replacements: { id: rows[0].account_id } });
    if (Number(used[0].total) > 0) throw new Error('نمی‌توان migration را برگرداند؛ حساب ۲۱۰۰ در دفتر کل استفاده شده است');
    await queryInterface.bulkDelete('erp_domain_seeded_accounts', { code: '2100' });
    await queryInterface.bulkDelete('financial_accounts', { id: rows[0].account_id });
  },
};
