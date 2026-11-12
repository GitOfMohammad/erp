const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('TreasuryTransfer', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  transfer_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  source_account_id: { type: DataTypes.UUID, allowNull: false },
  destination_account_id: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(18, 0), allowNull: false },
  transfer_date: { type: DataTypes.DATEONLY, allowNull: false },
  reference: { type: DataTypes.STRING(100), allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
  journal_entry_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  reverses_transfer_id: { type: DataTypes.UUID, allowNull: true, unique: true },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'treasury_transfers' });


