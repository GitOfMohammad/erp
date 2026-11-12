const { DataTypes } = require('sequelize')

module.exports = sequelize => sequelize.define('TaxSetting', {
  taxYear: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, allowNull: false, field: 'tax_year' },
  taxpayerStatus: { type: DataTypes.ENUM('unset', 'taxable', 'exempt'), allowNull: false, defaultValue: 'unset', field: 'taxpayer_status' },
  priceIncludesVat: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'price_includes_vat' },
  roundingMethod: { type: DataTypes.ENUM('line', 'document'), allowNull: false, defaultValue: 'document', field: 'rounding_method' },
  vatRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'vat_rate' },
}, { tableName: 'tax_settings', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
