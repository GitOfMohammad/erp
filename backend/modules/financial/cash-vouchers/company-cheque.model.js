const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CompanyCheque', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  checkbook_id: { type: DataTypes.UUID, allowNull: false },
  check_number: { type: DataTypes.STRING(50), allowNull: false },
  cheque_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  sayad_id: { type: DataTypes.STRING(50), allowNull: true, unique: true },
  issue_date: { type: DataTypes.DATEONLY, allowNull: false },
  check_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(18, 0), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ISSUED', validate: { isIn: [['ISSUED', 'CLEARED', 'RETURNED']] } },
  recipient_partner_id: { type: DataTypes.UUID, allowNull: false },
  issue_journal_entry_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  clearance_date: { type: DataTypes.DATEONLY, allowNull: true },
  clearance_journal_entry_id: { type: DataTypes.UUID, allowNull: true, unique: true },
  return_date: { type: DataTypes.DATEONLY, allowNull: true },
  return_journal_entry_id: { type: DataTypes.UUID, allowNull: true, unique: true },
  description: { type: DataTypes.STRING(500), allowNull: false },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'financial_company_cheques' });
