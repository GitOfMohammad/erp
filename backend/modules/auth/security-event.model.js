const { DataTypes } = require('sequelize')
module.exports = sequelize => sequelize.define('SecurityEvent', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: true },
  username: { type: DataTypes.STRING(100), allowNull: true },
  event_type: { type: DataTypes.STRING(32), allowNull: false },
  ip_address: { type: DataTypes.STRING(64), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  details: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: 'security_events', updatedAt: false, indexes: [{ fields: ['created_at'], name: 'security_events_created_at_idx' }, { fields: ['event_type', 'created_at'], name: 'security_events_type_created_idx' }] })
