const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('CashVoucher', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  voucher_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  direction: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['RECEIPT', 'PAYMENT']] } },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(18, 0), allowNull: false },
  category: { type: DataTypes.STRING(30), allowNull: false },
  treasury_account_id: { type: DataTypes.UUID, allowNull: false },
  counterpart_account_id: { type: DataTypes.UUID, allowNull: false },
  partner_id: { type: DataTypes.UUID, allowNull: true },
  method: { type: DataTypes.STRING(20), allowNull: false },
  method_details: { type: DataTypes.JSON, allowNull: true },
  reference: { type: DataTypes.STRING(100), allowNull: true },
  description: { type: DataTypes.STRING(500), allowNull: false },
  journal_entry_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  reverses_voucher_id: { type: DataTypes.UUID, allowNull: true, unique: true },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'financial_cash_vouchers' });
