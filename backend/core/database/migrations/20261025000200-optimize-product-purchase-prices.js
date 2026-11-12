'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('products', 'unit', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'عدد',
    });
    await queryInterface.addIndex('commercial_documents', ['document_type', 'status', 'fiscal_year', 'created_at'], {
      name: 'commercial_documents_purchase_price_lookup_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('commercial_documents', 'commercial_documents_purchase_price_lookup_idx');
    await queryInterface.changeColumn('products', 'unit', {
      type: Sequelize.STRING(30),
      allowNull: false,
    });
  },
};
