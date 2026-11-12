'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('bank_reconciliations', {
      id: { type: S.UUID, allowNull: false, primaryKey: true }, treasury_account_id: { type: S.UUID, allowNull: false, references: { model: 'treasury_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      start_date: { type: S.DATEONLY, allowNull: false }, end_date: { type: S.DATEONLY, allowNull: false }, statement_opening_balance: { type: S.DECIMAL(18, 0), allowNull: false }, statement_closing_balance: { type: S.DECIMAL(18, 0), allowNull: false }, status: { type: S.STRING(12), allowNull: false, defaultValue: 'DRAFT' },
      reconciled_by: { type: S.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' }, reconciled_at: { type: S.DATE, allowNull: true },
      created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('bank_reconciliations', ['treasury_account_id', 'end_date'], { unique: true, name: 'bank_reconciliation_account_end_uq' });
    await q.createTable('bank_reconciliation_lines', {
      id: { type: S.UUID, allowNull: false, primaryKey: true }, reconciliation_id: { type: S.UUID, allowNull: false, references: { model: 'bank_reconciliations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      transaction_date: { type: S.DATEONLY, allowNull: false }, description: { type: S.STRING(300), allowNull: false }, reference: { type: S.STRING(100), allowNull: true }, amount: { type: S.DECIMAL(18, 0), allowNull: false },
      matched_journal_line_id: { type: S.UUID, allowNull: true, references: { model: 'journal_lines', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('bank_reconciliation_lines', ['matched_journal_line_id'], { unique: true, name: 'bank_reconciliation_match_uq' });
  },
  async down(q) { await q.dropTable('bank_reconciliation_lines'); await q.dropTable('bank_reconciliations'); },
};
