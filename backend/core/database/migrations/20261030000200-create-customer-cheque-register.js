'use strict';
const { randomUUID } = require('node:crypto');

module.exports = {
  async up(q, S) {
    const now = new Date();
    const [existing] = await q.sequelize.query("SELECT id, account_type FROM financial_accounts WHERE code = '1020'");
    if (existing.length && existing[0].account_type !== 'ASSET') throw new Error('حساب 1020 باید از نوع دارایی باشد');
    if (!existing.length) {
      const accountId = randomUUID();
      await q.bulkInsert('financial_accounts', [{ id: accountId, code: '1020', name: 'چک‌های دریافتی نزد صندوق', account_type: 'ASSET', parent_id: null, is_system: 1, is_postable: 1, is_active: 1, created_at: now, updated_at: now }]);
      await q.bulkInsert('erp_domain_seeded_accounts', [{ code: '1020', account_id: accountId, created_at: now, updated_at: now }]);
    }

    await q.createTable('financial_customer_cheques', {
      id: { type: S.UUID, primaryKey: true, allowNull: false },
      cheque_no: { type: S.STRING(40), allowNull: false, unique: true },
      bank_name: { type: S.STRING(100), allowNull: false },
      check_number: { type: S.STRING(50), allowNull: false },
      account_number: { type: S.STRING(50), allowNull: true },
      sayad_id: { type: S.STRING(50), allowNull: true, unique: true },
      check_date: { type: S.DATEONLY, allowNull: false },
      received_date: { type: S.DATEONLY, allowNull: false },
      amount: { type: S.DECIMAL(18, 0), allowNull: false },
      status: { type: S.STRING(20), allowNull: false, defaultValue: 'HELD' },
      issuer_partner_id: { type: S.UUID, allowNull: false, references: { model: 'commercial_partners', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      receipt_journal_entry_id: { type: S.UUID, allowNull: false, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      transfer_no: { type: S.STRING(40), allowNull: true, unique: true },
      transfer_journal_entry_id: { type: S.UUID, allowNull: true, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      transferred_to_partner_id: { type: S.UUID, allowNull: true, references: { model: 'commercial_partners', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      transfer_date: { type: S.DATEONLY, allowNull: true },
      reference: { type: S.STRING(100), allowNull: true },
      description: { type: S.STRING(500), allowNull: true },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('financial_customer_cheques', ['status', 'check_date'], { name: 'customer_cheques_status_date_idx' });
    await q.addIndex('financial_customer_cheques', ['bank_name', 'check_number'], { unique: true, name: 'customer_cheques_identity_uq' });
  },

  async down(q) {
    const [rows] = await q.sequelize.query('SELECT receipt_journal_entry_id, transfer_journal_entry_id FROM financial_customer_cheques');
    const ids = rows.flatMap((row) => [row.receipt_journal_entry_id, row.transfer_journal_entry_id].filter(Boolean));
    if (ids.length) {
      const [used] = await q.sequelize.query('SELECT COUNT(*) AS total FROM journal_lines WHERE journal_entry_id IN (:ids)', { replacements: { ids } });
      if (Number(used[0].total) > 0) throw new Error('دفتر چک شامل اسناد ثبت‌شده است و قابل حذف نیست');
    }
    await q.removeIndex('financial_customer_cheques', 'customer_cheques_identity_uq');
    await q.removeIndex('financial_customer_cheques', 'customer_cheques_status_date_idx');
    await q.dropTable('financial_customer_cheques');
    const [seeded] = await q.sequelize.query("SELECT account_id FROM erp_domain_seeded_accounts WHERE code = '1020'");
    if (seeded.length) {
      const [usedAccount] = await q.sequelize.query('SELECT COUNT(*) AS total FROM journal_lines WHERE account_id = :id', { replacements: { id: seeded[0].account_id } });
      if (Number(usedAccount[0].total) > 0) throw new Error('حساب 1020 در دفتر کل استفاده شده و قابل حذف نیست');
      await q.bulkDelete('erp_domain_seeded_accounts', { code: '1020' });
      await q.bulkDelete('financial_accounts', { id: seeded[0].account_id });
    }
  },
};
