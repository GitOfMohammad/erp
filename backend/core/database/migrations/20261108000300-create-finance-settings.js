'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('finance_settings', {
      id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, primaryKey: true, defaultValue: 1 },
      fiscal_start: { type: Sequelize.DATEONLY, allowNull: true },
      fiscal_end: { type: Sequelize.DATEONLY, allowNull: true },
      base_currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'IRR' },
      enabled_currencies: { type: Sequelize.JSON, allowNull: false },
      exchange_rate_mode: { type: Sequelize.ENUM('manual'), allowNull: false, defaultValue: 'manual' },
      settlement_currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'IRR' },
      display_unit: { type: Sequelize.ENUM('rial', 'toman'), allowNull: false, defaultValue: 'rial' },
      allow_closed_period_posting: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      auto_create_draft_journal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    })
    await queryInterface.bulkInsert('finance_settings', [{
      id: 1,
      base_currency: 'IRR',
      enabled_currencies: JSON.stringify(['USD', 'EUR', 'AED']),
      exchange_rate_mode: 'manual',
      settlement_currency: 'IRR',
      display_unit: 'rial',
      allow_closed_period_posting: false,
      auto_create_draft_journal: true,
      created_at: new Date(),
      updated_at: new Date(),
    }])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('finance_settings')
  },
}
