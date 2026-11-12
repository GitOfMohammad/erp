const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('DirectPartnerSettlement', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  voucher_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  customer_partner_id: { type: DataTypes.UUID, allowNull: false },
  supplier_partner_id: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(18, 0), allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: false },
  reference: { type: DataTypes.STRING(100), allowNull: true },
  journal_entry_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  reverses_settlement_id: { type: DataTypes.UUID, allowNull: true, unique: true },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'financial_direct_partner_settlements' });
