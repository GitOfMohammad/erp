'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_logs', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      request_id: { type: Sequelize.STRING(36), allowNull: false },
      user_id: { type: Sequelize.UUID, allowNull: true },
      username: { type: Sequelize.STRING(100), allowNull: true },
      method: { type: Sequelize.STRING(10), allowNull: false },
      path: { type: Sequelize.STRING(255), allowNull: false },
      status_code: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
      duration_ms: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
    await queryInterface.addIndex('system_logs', ['created_at'], { name: 'system_logs_created_at_idx' })
    await queryInterface.addIndex('system_logs', ['status_code', 'created_at'], { name: 'system_logs_status_created_idx' })
    await queryInterface.addIndex('system_logs', ['user_id', 'created_at'], { name: 'system_logs_user_created_idx' })
    await queryInterface.addIndex('system_logs', ['request_id'], { name: 'system_logs_request_id_idx' })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('system_logs')
  },
}
