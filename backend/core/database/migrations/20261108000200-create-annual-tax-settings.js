'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tax_settings', {
      tax_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false, primaryKey: true },
      taxpayer_status: { type: Sequelize.ENUM('unset', 'taxable', 'exempt'), allowNull: false, defaultValue: 'unset' },
      price_includes_vat: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      rounding_method: { type: Sequelize.ENUM('line', 'document'), allowNull: false, defaultValue: 'document' },
      vat_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tax_settings');
  },
};
