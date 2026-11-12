const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CompanyCheckbook', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(120), allowNull: false },
  treasury_account_id: { type: DataTypes.UUID, allowNull: false },
  number_prefix: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '' },
  number_start: { type: DataTypes.STRING(30), allowNull: false },
  number_end: { type: DataTypes.STRING(30), allowNull: false },
  number_width: { type: DataTypes.INTEGER, allowNull: false },
  is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'financial_company_checkbooks' });
