'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('payable_settlements', {
      id: { type: S.UUID, allowNull: false, primaryKey: true },
      source_type: { type: S.STRING(40), allowNull: false },
      source_id: { type: S.UUID, allowNull: false },
      treasury_account_id: { type: S.UUID, allowNull: false, references: { model: 'treasury_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      amount: { type: S.DECIMAL(18, 0), allowNull: false },
      method: { type: S.STRING(20), allowNull: false },
      reference: { type: S.STRING(100), allowNull: true },
      paid_at: { type: S.DATEONLY, allowNull: false },
      note: { type: S.TEXT, allowNull: true },
      journal_entry_id: { type: S.UUID, allowNull: true, unique: true, references: { model: 'journal_entries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      reverses_settlement_id: { type: S.UUID, allowNull: true, unique: true, references: { model: 'payable_settlements', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      created_at: { type: S.DATE, allowNull: false },
      updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('payable_settlements', ['source_type', 'source_id', 'paid_at'], { name: 'payable_settlements_source_date_idx' });
  },
  async down(q) {
    const [rows] = await q.sequelize.query('SELECT journal_entry_id FROM payable_settlements WHERE journal_entry_id IS NOT NULL');
    for (const row of rows) {
      const [used] = await q.sequelize.query('SELECT COUNT(*) AS total FROM journal_lines WHERE journal_entry_id = :id', { replacements: { id: row.journal_entry_id } });
      if (Number(used[0].total) > 0) throw new Error('Cannot remove payable settlements while their journal entries are in use');
    }
    await q.removeIndex('payable_settlements', 'payable_settlements_source_date_idx');
    await q.dropTable('payable_settlements');
  },
};
