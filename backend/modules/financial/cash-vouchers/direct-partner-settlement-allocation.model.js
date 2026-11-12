const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('DirectPartnerSettlementAllocation', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  settlement_id: { type: DataTypes.UUID, allowNull: false },
  document_id: { type: DataTypes.UUID, allowNull: false },
  direction: { type: DataTypes.STRING(3), allowNull: false },
  amount: { type: DataTypes.DECIMAL(18, 0), allowNull: false },
}, { tableName: 'financial_direct_partner_settlement_allocations' });
