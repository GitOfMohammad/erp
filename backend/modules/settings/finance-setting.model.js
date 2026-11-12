const { DataTypes } = require('sequelize')

module.exports = sequelize => sequelize.define('FinanceSetting', {
  id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, allowNull: false, defaultValue: 1 },
  fiscalStart: { type: DataTypes.DATEONLY, allowNull: true, field: 'fiscal_start' },
  fiscalEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'fiscal_end' },
  baseCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'IRR', field: 'base_currency' },
  enabledCurrencies: { type: DataTypes.JSON, allowNull: false, defaultValue: ['USD', 'EUR', 'AED'], field: 'enabled_currencies' },
  exchangeRateMode: { type: DataTypes.ENUM('manual'), allowNull: false, defaultValue: 'manual', field: 'exchange_rate_mode' },
  settlementCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'IRR', field: 'settlement_currency' },
  displayUnit: { type: DataTypes.ENUM('rial', 'toman'), allowNull: false, defaultValue: 'rial', field: 'display_unit' },
  allowClosedPeriodPosting: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'allow_closed_period_posting' },
  autoCreateDraftJournal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'auto_create_draft_journal' },
}, { tableName: 'finance_settings' })
