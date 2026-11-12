const { DataTypes } = require('sequelize')
module.exports = sequelize => sequelize.define('PrintSetting', {
  id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, allowNull: false, defaultValue: 1 },
  printOptions: { type: DataTypes.JSON, allowNull: false, defaultValue: {} , field: 'print_options' },
  templates: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'templates' },
  defaults: { type: DataTypes.JSON, allowNull: false, defaultValue: {}, field: 'document_defaults' },
}, { tableName: 'print_settings' })
