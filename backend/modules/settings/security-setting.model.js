const { DataTypes } = require('sequelize')
module.exports = sequelize => sequelize.define('SecuritySetting', {
  id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, allowNull: false, defaultValue: 1 },
  minimumPasswordLength: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 8, field: 'minimum_password_length' },
  requireNumber: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'require_number' },
  requireSymbol: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'require_symbol' },
  sessionDurationHours: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 168, field: 'session_duration_hours' },
  recordSecurityEvents: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'record_security_events' },
  eventRetentionDays: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 90, field: 'event_retention_days' },
}, { tableName: 'security_settings' })
