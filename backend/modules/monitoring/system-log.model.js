const { DataTypes } = require('sequelize')

module.exports = sequelize => sequelize.define('SystemLog', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  request_id: { type: DataTypes.STRING(36), allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: true },
  username: { type: DataTypes.STRING(100), allowNull: true },
  method: { type: DataTypes.STRING(10), allowNull: false },
  path: { type: DataTypes.STRING(255), allowNull: false },
  status_code: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
  duration_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  ip_address: { type: DataTypes.STRING(64), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'system_logs', timestamps: false, indexes: [
  { fields: ['created_at'], name: 'system_logs_created_at_idx' },
  { fields: ['status_code', 'created_at'], name: 'system_logs_status_created_idx' },
  { fields: ['user_id', 'created_at'], name: 'system_logs_user_created_idx' },
  { fields: ['request_id'], name: 'system_logs_request_id_idx' },
] })
