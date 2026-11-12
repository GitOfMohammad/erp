'use strict';

module.exports = {
  async up(q, S) {
    await q.createTable('financial_cash_vouchers', {
      id: { type: S.UUID, allowNull: false, primaryKey: true },
      voucher_no: { type: S.STRING(40), allowNull: false, unique: true },
      direction: { type: S.STRING(10), allowNull: false },
      entry_date: { type: S.DATEONLY, allowNull: false },
      amount: { type: S.DECIMAL(18, 0), allowNull: false },
      treasury_account_id: { type: S.UUID, allowNull: false, references: { model: 'treasury_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      counterpart_account_id: { type: S.UUID, allowNull: false, references: { model: 'financial_accounts', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      partner_id: { type: S.UUID, allowNull: true, references: { model: 'commercial_partners', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      method: { type: S.STRING(20), allowNull: false },
      reference: { type: S.STRING(100), allowNull: true },
      description: { type: S.STRING(500), allowNull: false },
      journal_entry_id: { type: S.UUID, allowNull: false, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false },
      updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('financial_cash_vouchers', ['direction', 'entry_date'], { name: 'financial_cash_vouchers_direction_date_idx' });
  },
  async down(q) {
    await q.removeIndex('financial_cash_vouchers', 'financial_cash_vouchers_direction_date_idx');
    await q.dropTable('financial_cash_vouchers');
  },
};
