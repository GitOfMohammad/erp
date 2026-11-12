'use strict';

const financialAccounts = [
  ['1300', 'مالیات خرید قابل‌استرداد', 'ASSET'],
  ['5300', 'هزینه و اختلاف گرد کردن خرید', 'EXPENSE'],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const documentColumns = [
      ['subtotal_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['line_discount_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['discount_percent', { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0 }],
      ['discount_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['tax_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['freight_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['rounding_unit', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 }],
      ['rounding_method', { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'NEAREST' }],
      ['rounding_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
    ];
    const itemColumns = [
      ['gross_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['discount_percent', { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0 }],
      ['discount_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['document_discount_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['tax_percent', { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0 }],
      ['tax_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['net_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
      ['allocated_freight_amount', { type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 0 }],
    ];
    for (const [name, definition] of documentColumns) await queryInterface.addColumn('commercial_documents', name, definition);
    for (const [name, definition] of itemColumns) await queryInterface.addColumn('commercial_document_items', name, definition);
    await queryInterface.sequelize.query('UPDATE commercial_document_items SET gross_amount = line_total, net_amount = line_total WHERE gross_amount = 0 AND net_amount = 0');
    await queryInterface.sequelize.query('UPDATE commercial_documents SET subtotal_amount = total_amount WHERE subtotal_amount = 0 AND total_amount > 0');

    const [existing] = await queryInterface.sequelize.query("SELECT code FROM financial_accounts WHERE code IN ('1300', '5300')");
    const existingCodes = new Set(existing.map((row) => row.code));
    const now = new Date();
    for (const [code, name, account_type] of financialAccounts) {
      if (!existingCodes.has(code)) await queryInterface.bulkInsert('financial_accounts', [{
        id: require('node:crypto').randomUUID(), code, name, account_type, parent_id: null,
        is_system: 1, is_postable: 1, is_active: 1, created_at: now, updated_at: now,
      }]);
    }
  },

  async down(queryInterface) {
    const [used] = await queryInterface.sequelize.query("SELECT COUNT(*) AS count FROM journal_lines jl JOIN financial_accounts fa ON fa.id = jl.account_id WHERE fa.code IN ('1300', '5300')");
    if (Number(used[0].count) > 0) throw new Error('Cannot remove commercial pricing accounts that have journal entries');
    await queryInterface.bulkDelete('financial_accounts', { code: ['1300', '5300'] });
    for (const name of ['allocated_freight_amount', 'net_amount', 'tax_amount', 'tax_percent', 'document_discount_amount', 'discount_amount', 'discount_percent', 'gross_amount']) await queryInterface.removeColumn('commercial_document_items', name);
    for (const name of ['rounding_amount', 'rounding_method', 'rounding_unit', 'freight_amount', 'tax_amount', 'discount_amount', 'discount_percent', 'line_discount_amount', 'subtotal_amount']) await queryInterface.removeColumn('commercial_documents', name);
  },
};
