const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('FinancialAccount', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  account_type: { type: DataTypes.STRING(12), allowNull: false, validate: { isIn: [['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'MEMORANDUM']] } },
  parent_id: { type: DataTypes.UUID, allowNull: true },
  is_group_root: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  is_system: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  is_postable: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, validate: { isIn: [[0, 1]] } },
}, { tableName: 'financial_accounts' });
