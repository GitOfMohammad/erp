const { DataTypes } = require('sequelize')

module.exports = sequelize => sequelize.define('MoadianSetting', {
  id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, allowNull: false, defaultValue: 1 },
  environment: { type: DataTypes.ENUM('sandbox', 'production'), allowNull: false, defaultValue: 'sandbox' },
  deliveryMode: { type: DataTypes.ENUM('direct', 'intermediary'), allowNull: false, defaultValue: 'direct', field: 'delivery_mode' },
  fiscalMemoryId: { type: DataTypes.STRING(64), allowNull: true, field: 'fiscal_memory_id' },
  intermediaryName: { type: DataTypes.STRING(160), allowNull: true, field: 'intermediary_name' },
}, { tableName: 'moadian_settings', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
