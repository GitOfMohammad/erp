const { DataTypes } = require('sequelize')
module.exports = sequelize => sequelize.define('InventorySetting', {
  id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, allowNull: false, defaultValue: 1 },
  purchaseWarehouseId: { type: DataTypes.UUID, allowNull: true, field: 'purchase_warehouse_id' },
  salesWarehouseId: { type: DataTypes.UUID, allowNull: true, field: 'sales_warehouse_id' },
  productionWarehouseId: { type: DataTypes.UUID, allowNull: true, field: 'production_warehouse_id' },
  requireCountApproval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'require_count_approval' },
  inventoryAccountId: { type: DataTypes.UUID, allowNull: true, field: 'inventory_account_id' },
  stockGainAccountId: { type: DataTypes.UUID, allowNull: true, field: 'stock_gain_account_id' },
  stockLossAccountId: { type: DataTypes.UUID, allowNull: true, field: 'stock_loss_account_id' },
}, { tableName: 'inventory_settings' })
