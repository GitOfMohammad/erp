'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('moadian_settings', {
      id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, primaryKey: true, defaultValue: 1 },
      environment: { type: Sequelize.ENUM('sandbox', 'production'), allowNull: false, defaultValue: 'sandbox' },
      delivery_mode: { type: Sequelize.ENUM('direct', 'intermediary'), allowNull: false, defaultValue: 'direct' },
      fiscal_memory_id: { type: Sequelize.STRING(64), allowNull: true },
      intermediary_name: { type: Sequelize.STRING(160), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    })
  },
  async down(queryInterface) { await queryInterface.dropTable('moadian_settings') },
}
