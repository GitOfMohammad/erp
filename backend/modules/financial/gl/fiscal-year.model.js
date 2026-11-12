const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('FiscalYear', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(80), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'CLOSED' },
  closing_journal_entry_id: { type: DataTypes.UUID, allowNull: true },
  closed_by: { type: DataTypes.UUID, allowNull: true },
  closed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'financial_fiscal_years', indexes: [{ unique: true, fields: ['start_date', 'end_date'], name: 'financial_fiscal_year_dates_uq' }] });
