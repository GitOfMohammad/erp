const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('JournalEntry', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  entry_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  source_type: { type: DataTypes.STRING(30), allowNull: false },
  source_id: { type: DataTypes.UUID, allowNull: false },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: false },
  status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'POSTED' },
  created_by: { type: DataTypes.UUID, allowNull: false },
  posted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'journal_entries', indexes: [{ unique: true, fields: ['source_type', 'source_id'], name: 'journal_entries_source_unique' }] });
