'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('financial_fiscal_years', {
      id: { type: S.UUID, allowNull: false, primaryKey: true },
      name: { type: S.STRING(80), allowNull: false },
      start_date: { type: S.DATEONLY, allowNull: false }, end_date: { type: S.DATEONLY, allowNull: false },
      status: { type: S.STRING(12), allowNull: false, defaultValue: 'CLOSED' },
      closing_journal_entry_id: { type: S.UUID, allowNull: true, references: { model: 'journal_entries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      closed_by: { type: S.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      closed_at: { type: S.DATE, allowNull: true }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('financial_fiscal_years', ['start_date', 'end_date'], { unique: true, name: 'financial_fiscal_year_dates_uq' });
  },
  async down(q) { await q.dropTable('financial_fiscal_years'); },
};
