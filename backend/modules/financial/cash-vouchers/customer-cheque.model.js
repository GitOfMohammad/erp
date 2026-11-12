const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CustomerCheque', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  cheque_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  bank_name: { type: DataTypes.STRING(100), allowNull: false },
  check_number: { type: DataTypes.STRING(50), allowNull: false },
  account_number: { type: DataTypes.STRING(50), allowNull: true },
  sayad_id: { type: DataTypes.STRING(50), allowNull: true, unique: true },
  check_date: { type: DataTypes.DATEONLY, allowNull: false },
  received_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(18, 0), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'HELD', validate: { isIn: [['HELD', 'IN_COLLECTION', 'COLLECTED', 'RETURNED', 'TRANSFERRED']] } },
  issuer_partner_id: { type: DataTypes.UUID, allowNull: false },
  receipt_journal_entry_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  transfer_no: { type: DataTypes.STRING(40), allowNull: true, unique: true },
  transfer_journal_entry_id: { type: DataTypes.UUID, allowNull: true, unique: true },
  transferred_to_partner_id: { type: DataTypes.UUID, allowNull: true },
  transfer_date: { type: DataTypes.DATEONLY, allowNull: true },
  reference: { type: DataTypes.STRING(100), allowNull: true },
  description: { type: DataTypes.STRING(500), allowNull: true },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'financial_customer_cheques' });
