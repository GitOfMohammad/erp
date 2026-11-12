'use strict';
module.exports = {
  async up(q, S) {
    await q.createTable('sales_representatives', {
      id: { type: S.UUID, primaryKey: true, allowNull: false },
      name: { type: S.STRING(200), allowNull: false },
      phone: { type: S.STRING(30), allowNull: true },
      email: { type: S.STRING(254), allowNull: true },
      is_active: { type: S.TINYINT, allowNull: false, defaultValue: 1 },
      created_at: { type: S.DATE, allowNull: false },
      updated_at: { type: S.DATE, allowNull: false },
    });
    await q.addColumn('commercial_documents', 'sales_representative_id', {
      type: S.UUID, allowNull: true,
      references: { model: 'sales_representatives', key: 'id' },
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    });
    await q.addIndex('commercial_documents', ['sales_representative_id'], { name: 'commercial_documents_sales_rep_idx' });
  },
  async down(q) {
    await q.removeIndex('commercial_documents', 'commercial_documents_sales_rep_idx');
    await q.removeColumn('commercial_documents', 'sales_representative_id');
    await q.dropTable('sales_representatives');
  },
};
