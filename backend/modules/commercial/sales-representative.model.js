const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('SalesRepresentative', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(200), allowNull: false },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(254), allowNull: true },
  is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
}, { tableName: 'sales_representatives' });
