'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('commercial_documents', 'exchange_rate', {
      type: Sequelize.DECIMAL(18, 0), allowNull: false, defaultValue: 1,
    });
    await queryInterface.addColumn('commercial_documents', 'due_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    });
    await queryInterface.addColumn('commercial_documents', 'transaction_amounts', {
      type: Sequelize.JSON, allowNull: true,
    });
    await queryInterface.addColumn('commercial_document_items', 'transaction_amounts', {
      type: Sequelize.JSON, allowNull: true,
    });
    await queryInterface.addIndex('commercial_documents', ['document_type', 'due_date', 'status'], {
      name: 'commercial_documents_due_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('commercial_documents', 'commercial_documents_due_status_idx');
    await queryInterface.removeColumn('commercial_document_items', 'transaction_amounts');
    await queryInterface.removeColumn('commercial_documents', 'transaction_amounts');
    await queryInterface.removeColumn('commercial_documents', 'due_date');
    await queryInterface.removeColumn('commercial_documents', 'exchange_rate');
  },
};
