const { DataTypes } = require('sequelize');
module.exports = (sequelize) => ({
  BankReconciliation: sequelize.define('BankReconciliation', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
    treasury_account_id: { type: DataTypes.UUID, allowNull: false }, start_date: { type: DataTypes.DATEONLY, allowNull: false }, end_date: { type: DataTypes.DATEONLY, allowNull: false },
    statement_opening_balance: { type: DataTypes.DECIMAL(18, 0), allowNull: false }, statement_closing_balance: { type: DataTypes.DECIMAL(18, 0), allowNull: false }, status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'DRAFT' },
    reconciled_by: { type: DataTypes.UUID, allowNull: true }, reconciled_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'bank_reconciliations', indexes: [{ unique: true, fields: ['treasury_account_id', 'end_date'], name: 'bank_reconciliation_account_end_uq' }] }),
  BankReconciliationLine: sequelize.define('BankReconciliationLine', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
    reconciliation_id: { type: DataTypes.UUID, allowNull: false }, transaction_date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.STRING(300), allowNull: false }, reference: { type: DataTypes.STRING(100), allowNull: true }, amount: { type: DataTypes.DECIMAL(18, 0), allowNull: false }, matched_journal_line_id: { type: DataTypes.UUID, allowNull: true, unique: true },
  }, { tableName: 'bank_reconciliation_lines' }),
});
