const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('JournalLine', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  journal_entry_id: { type: DataTypes.UUID, allowNull: false },
  account_id: { type: DataTypes.UUID, allowNull: false },
  partner_id: { type: DataTypes.UUID, allowNull: true },
  treasury_account_id: { type: DataTypes.UUID, allowNull: true },
  debit: { type: DataTypes.DECIMAL(18, 0), allowNull: false, defaultValue: 0 },
  credit: { type: DataTypes.DECIMAL(18, 0), allowNull: false, defaultValue: 0 },
  description: { type: DataTypes.STRING(300), allowNull: true },
}, { tableName: 'journal_lines' });
