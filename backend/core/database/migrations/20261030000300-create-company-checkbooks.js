'use strict';
const { randomUUID } = require('node:crypto');

module.exports = {
  async up(q, S) {
    const now = new Date();
    const [existing] = await q.sequelize.query("SELECT id, account_type, is_postable FROM financial_accounts WHERE code = '2110'");
    if (existing.length && (existing[0].account_type !== 'LIABILITY' || Number(existing[0].is_postable) !== 1)) {
      throw new Error('حساب ۲۱۱۰ باید یک حساب پرداختنیِ قابل ثبت باشد');
    }
    if (!existing.length) {
      const accountId = randomUUID();
      await q.bulkInsert('financial_accounts', [{ id: accountId, code: '2110', name: 'چک‌های پرداختنی', account_type: 'LIABILITY', parent_id: null, is_system: 1, is_postable: 1, is_active: 1, created_at: now, updated_at: now }]);
      await q.bulkInsert('erp_domain_seeded_accounts', [{ code: '2110', account_id: accountId, created_at: now, updated_at: now }]);
    }
    await q.createTable('financial_company_checkbooks', {
      id: { type: S.UUID, primaryKey: true, allowNull: false },
      name: { type: S.STRING(120), allowNull: false },
      treasury_account_id: { type: S.UUID, allowNull: false, references: { model: 'treasury_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      number_prefix: { type: S.STRING(20), allowNull: false, defaultValue: '' },
      number_start: { type: S.STRING(30), allowNull: false },
      number_end: { type: S.STRING(30), allowNull: false },
      number_width: { type: S.INTEGER, allowNull: false },
      is_active: { type: S.TINYINT, allowNull: false, defaultValue: 1 },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.createTable('financial_company_cheques', {
      id: { type: S.UUID, primaryKey: true, allowNull: false },
      checkbook_id: { type: S.UUID, allowNull: false, references: { model: 'financial_company_checkbooks', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      check_number: { type: S.STRING(50), allowNull: false },
      cheque_no: { type: S.STRING(50), allowNull: false, unique: true },
      sayad_id: { type: S.STRING(50), allowNull: true, unique: true },
      issue_date: { type: S.DATEONLY, allowNull: false }, check_date: { type: S.DATEONLY, allowNull: false },
      amount: { type: S.DECIMAL(18, 0), allowNull: false },
      status: { type: S.STRING(20), allowNull: false, defaultValue: 'ISSUED' },
      recipient_partner_id: { type: S.UUID, allowNull: false, references: { model: 'commercial_partners', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      issue_journal_entry_id: { type: S.UUID, allowNull: false, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      clearance_date: { type: S.DATEONLY, allowNull: true },
      clearance_journal_entry_id: { type: S.UUID, allowNull: true, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      return_date: { type: S.DATEONLY, allowNull: true },
      return_journal_entry_id: { type: S.UUID, allowNull: true, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      description: { type: S.STRING(500), allowNull: false },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('financial_company_cheques', ['checkbook_id', 'check_number'], { unique: true, name: 'company_cheque_number_uq' });
    await q.addIndex('financial_company_cheques', ['status', 'check_date'], { name: 'company_cheque_status_date_idx' });
  },
  async down(q) {
    const [usedRows] = await q.sequelize.query('SELECT issue_journal_entry_id, clearance_journal_entry_id, return_journal_entry_id FROM financial_company_cheques');
    const ids = usedRows.flatMap((row) => [row.issue_journal_entry_id, row.clearance_journal_entry_id, row.return_journal_entry_id].filter(Boolean));
    if (ids.length) {
      const [used] = await q.sequelize.query('SELECT COUNT(*) AS total FROM journal_lines WHERE journal_entry_id IN (:ids)', { replacements: { ids } });
      if (Number(used[0].total) > 0) throw new Error('دسته‌چک‌ها شامل اسناد ثبت‌شده هستند و قابل حذف نیستند');
    }
    const [seeded] = await q.sequelize.query("SELECT account_id FROM erp_domain_seeded_accounts WHERE code = '2110'");
    if (seeded.length) {
      const [usedAccount] = await q.sequelize.query('SELECT COUNT(*) AS total FROM journal_lines WHERE account_id = :id', { replacements: { id: seeded[0].account_id } });
      if (Number(usedAccount[0].total) > 0) throw new Error('حساب چک‌های پرداختنی در دفتر کل استفاده شده و قابل حذف نیست');
    }
    await q.removeIndex('financial_company_cheques', 'company_cheque_status_date_idx');
    await q.removeIndex('financial_company_cheques', 'company_cheque_number_uq');
    await q.dropTable('financial_company_cheques');
    await q.dropTable('financial_company_checkbooks');
    if (seeded.length) {
      await q.bulkDelete('erp_domain_seeded_accounts', { code: '2110' });
      await q.bulkDelete('financial_accounts', { id: seeded[0].account_id });
    }
  },
};
