'use strict';
const { randomUUID } = require('node:crypto');
const accounts = [
  ['1000', 'وجه نقد', 'ASSET', 0], ['1010', 'حساب‌های بانکی', 'ASSET', 0],
  ['1100', 'حساب‌های دریافتنی', 'ASSET', 1], ['1200', 'موجودی کالا', 'ASSET', 1],
  ['2000', 'حساب‌های پرداختنی', 'LIABILITY', 1], ['3000', 'مانده افتتاحیه', 'EQUITY', 1],
  ['4000', 'درآمد فروش', 'REVENUE', 1], ['4010', 'برگشت از فروش', 'REVENUE', 1],
  ['5000', 'بهای تمام‌شده کالای فروش‌رفته', 'EXPENSE', 1], ['5100', 'اختلاف بهای برگشت خرید', 'EXPENSE', 1],
  ['4100', 'سود تعدیل موجودی', 'REVENUE', 1], ['5200', 'زیان تعدیل موجودی', 'EXPENSE', 1],
];
module.exports = {
  async up(q, S) {
    const now = new Date();
    await q.createTable('financial_accounts', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, code: { type: S.STRING(30), allowNull: false, unique: true },
      name: { type: S.STRING(150), allowNull: false }, account_type: { type: S.STRING(12), allowNull: false },
      parent_id: { type: S.UUID, allowNull: true, references: { model: 'financial_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      is_system: { type: S.TINYINT, allowNull: false, defaultValue: 0 }, is_postable: { type: S.TINYINT, allowNull: false, defaultValue: 1 },
      is_active: { type: S.TINYINT, allowNull: false, defaultValue: 1 }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.createTable('treasury_accounts', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, code: { type: S.STRING(30), allowNull: false, unique: true },
      name: { type: S.STRING(150), allowNull: false }, account_type: { type: S.STRING(4), allowNull: false },
      financial_account_id: { type: S.UUID, allowNull: false, unique: true, references: { model: 'financial_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      bank_name: { type: S.STRING(100), allowNull: true }, account_number: { type: S.STRING(50), allowNull: true }, iban: { type: S.STRING(34), allowNull: true },
      is_active: { type: S.TINYINT, allowNull: false, defaultValue: 1 }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.createTable('journal_entries', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, entry_no: { type: S.STRING(40), allowNull: false, unique: true },
      source_type: { type: S.STRING(30), allowNull: false }, source_id: { type: S.UUID, allowNull: false }, entry_date: { type: S.DATEONLY, allowNull: false },
      description: { type: S.STRING(500), allowNull: false }, status: { type: S.STRING(10), allowNull: false, defaultValue: 'POSTED' },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      posted_at: { type: S.DATE, allowNull: false }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('journal_entries', ['source_type', 'source_id'], { unique: true, name: 'journal_entries_source_unique' });
    await q.createTable('journal_lines', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, journal_entry_id: { type: S.UUID, allowNull: false, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      account_id: { type: S.UUID, allowNull: false, references: { model: 'financial_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      partner_id: { type: S.UUID, allowNull: true, references: { model: 'commercial_partners', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      treasury_account_id: { type: S.UUID, allowNull: true, references: { model: 'treasury_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      debit: { type: S.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }, credit: { type: S.DECIMAL(18, 0), allowNull: false, defaultValue: 0 },
      description: { type: S.STRING(300), allowNull: true }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('journal_lines', ['account_id', 'journal_entry_id'], { name: 'journal_lines_account_entry_idx' });
    await q.createTable('treasury_transfers', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, transfer_no: { type: S.STRING(40), allowNull: false, unique: true },
      source_account_id: { type: S.UUID, allowNull: false, references: { model: 'treasury_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      destination_account_id: { type: S.UUID, allowNull: false, references: { model: 'treasury_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      amount: { type: S.DECIMAL(18, 0), allowNull: false }, transfer_date: { type: S.DATEONLY, allowNull: false }, reference: { type: S.STRING(100), allowNull: true }, note: { type: S.TEXT, allowNull: true },
      journal_entry_id: { type: S.UUID, allowNull: false, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addColumn('stock_balances', 'avg_unit_cost', { type: S.DECIMAL(18, 0), allowNull: false, defaultValue: 0 });
    await q.addColumn('commercial_document_items', 'cost_unit', { type: S.DECIMAL(18, 0), allowNull: true });
    await q.addColumn('commercial_settlements', 'treasury_account_id', { type: S.UUID, allowNull: true, references: { model: 'treasury_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await q.addColumn('commercial_settlements', 'journal_entry_id', { type: S.UUID, allowNull: true, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await q.addIndex('commercial_settlements', ['treasury_account_id', 'paid_at'], { name: 'commercial_settlements_treasury_date_idx' });
    await q.bulkInsert('financial_accounts', accounts.map(([code, name, type, postable]) => ({ id: randomUUID(), code, name, account_type: type, parent_id: null, is_system: 1, is_postable: postable, is_active: 1, created_at: now, updated_at: now })));
  },
  async down(q) {
    await q.removeIndex('commercial_settlements', 'commercial_settlements_treasury_date_idx');
    await q.removeColumn('commercial_settlements', 'journal_entry_id'); await q.removeColumn('commercial_settlements', 'treasury_account_id');
    await q.removeColumn('commercial_document_items', 'cost_unit'); await q.removeColumn('stock_balances', 'avg_unit_cost');
    await q.dropTable('treasury_transfers'); await q.removeIndex('journal_lines', 'journal_lines_account_entry_idx'); await q.dropTable('journal_lines');
    await q.removeIndex('journal_entries', 'journal_entries_source_unique'); await q.dropTable('journal_entries'); await q.dropTable('treasury_accounts'); await q.dropTable('financial_accounts');
  },
};
