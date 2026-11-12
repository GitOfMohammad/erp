'use strict';

module.exports = {
  async up(q, S) {
    await q.createTable('financial_direct_partner_settlements', {
      id: { type: S.UUID, allowNull: false, primaryKey: true },
      voucher_no: { type: S.STRING(40), allowNull: false, unique: true },
      entry_date: { type: S.DATEONLY, allowNull: false },
      customer_partner_id: { type: S.UUID, allowNull: false, references: { model: 'commercial_partners', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      supplier_partner_id: { type: S.UUID, allowNull: false, references: { model: 'commercial_partners', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      amount: { type: S.DECIMAL(18, 0), allowNull: false },
      description: { type: S.STRING(500), allowNull: false },
      reference: { type: S.STRING(100), allowNull: true },
      journal_entry_id: { type: S.UUID, allowNull: false, unique: true, references: { model: 'journal_entries', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      reverses_settlement_id: { type: S.UUID, allowNull: true, unique: true, references: { model: 'financial_direct_partner_settlements', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_by: { type: S.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false },
      updated_at: { type: S.DATE, allowNull: false },
    });
    await q.createTable('financial_direct_partner_settlement_allocations', {
      id: { type: S.UUID, allowNull: false, primaryKey: true },
      settlement_id: { type: S.UUID, allowNull: false, references: { model: 'financial_direct_partner_settlements', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      document_id: { type: S.UUID, allowNull: false, references: { model: 'commercial_documents', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      direction: { type: S.STRING(3), allowNull: false },
      amount: { type: S.DECIMAL(18, 0), allowNull: false },
      created_at: { type: S.DATE, allowNull: false },
      updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addIndex('financial_direct_partner_settlements', ['entry_date'], { name: 'financial_direct_partner_settlements_date_idx' });
    await q.addIndex('financial_direct_partner_settlements', ['customer_partner_id', 'supplier_partner_id'], { name: 'financial_direct_partner_settlements_partners_idx' });
    await q.addIndex('financial_direct_partner_settlement_allocations', ['document_id'], { name: 'financial_direct_partner_settlement_allocations_doc_idx' });
  },
  async down(q) {
    await q.removeIndex('financial_direct_partner_settlement_allocations', 'financial_direct_partner_settlement_allocations_doc_idx');
    await q.removeIndex('financial_direct_partner_settlements', 'financial_direct_partner_settlements_partners_idx');
    await q.removeIndex('financial_direct_partner_settlements', 'financial_direct_partner_settlements_date_idx');
    await q.dropTable('financial_direct_partner_settlement_allocations');
    await q.dropTable('financial_direct_partner_settlements');
  },
};
