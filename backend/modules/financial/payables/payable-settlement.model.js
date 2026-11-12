'use strict';
const { DataTypes: D } = require('sequelize');
module.exports = (sequelize) => sequelize.define('PayableSettlement', {
  id: { type: D.UUID, primaryKey: true, allowNull: false, defaultValue: D.UUIDV4 },
  source_type: { type: D.STRING(40), allowNull: false },
  source_id: { type: D.UUID, allowNull: false },
  treasury_account_id: { type: D.UUID, allowNull: false },
  amount: { type: D.DECIMAL(18, 0), allowNull: false },
  method: { type: D.STRING(20), allowNull: false },
  reference: { type: D.STRING(100), allowNull: true },
  paid_at: { type: D.DATEONLY, allowNull: false },
  note: { type: D.TEXT, allowNull: true },
  journal_entry_id: { type: D.UUID, allowNull: true, unique: true },
  reverses_settlement_id: { type: D.UUID, allowNull: true, unique: true },
  created_by: { type: D.UUID, allowNull: false },
}, { tableName: 'payable_settlements' });
