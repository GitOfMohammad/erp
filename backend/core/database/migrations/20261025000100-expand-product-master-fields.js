'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'secondary_unit', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'units_per_secondary', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'weight_kg', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'sale_price', {
      type: Sequelize.DECIMAL(18, 0),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('products', 'tax_type', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.sequelize.query("UPDATE products SET unit = 'عدد' WHERE unit IS NULL OR TRIM(unit) = ''");
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'tax_type');
    await queryInterface.removeColumn('products', 'sale_price');
    await queryInterface.removeColumn('products', 'weight_kg');
    await queryInterface.removeColumn('products', 'units_per_secondary');
    await queryInterface.removeColumn('products', 'secondary_unit');
  },
};
