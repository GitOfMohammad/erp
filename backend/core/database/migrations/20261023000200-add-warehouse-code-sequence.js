'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('warehouse_code_sequence', {
      id: { type: Sequelize.TINYINT, primaryKey: true, allowNull: false },
      next_code: { type: Sequelize.INTEGER, allowNull: false },
    });
    await queryInterface.bulkInsert('warehouse_code_sequence', [{ id: 1, next_code: 1 }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('warehouse_code_sequence');
  },
};
