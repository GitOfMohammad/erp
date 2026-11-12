'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query("UPDATE products SET barcode = NULL WHERE TRIM(barcode) = ''", { transaction });
      const [products] = await queryInterface.sequelize.query('SELECT id FROM products ORDER BY created_at, id', { transaction });
      const [existingCodes] = await queryInterface.sequelize.query('SELECT code FROM products', { transaction });
      if (products.length > 90000) throw new Error('Product code range 10000-99999 is exhausted');
      const reserved = new Set(existingCodes.map(({ code }) => code));
      for (let i = 0; i < products.length; i++) {
        let temporary = `MIGRATE_${products[i].id}`;
        while (reserved.has(temporary)) temporary += '_';
        reserved.add(temporary);
        await queryInterface.sequelize.query('UPDATE products SET code = :code WHERE id = :id', {
          replacements: { code: temporary, id: products[i].id }, transaction,
        });
      }
      for (let i = 0; i < products.length; i++) {
        await queryInterface.sequelize.query('UPDATE products SET code = :code WHERE id = :id', {
          replacements: { code: String(10000 + i), id: products[i].id }, transaction,
        });
      }
      await queryInterface.changeColumn('products', 'code', { type: Sequelize.STRING(5), allowNull: false }, { transaction });
    });
    await queryInterface.createTable('product_code_sequence', {
      id: { type: Sequelize.TINYINT, primaryKey: true, allowNull: false },
      next_code: { type: Sequelize.INTEGER, allowNull: false },
    });
    await queryInterface.bulkInsert('product_code_sequence', [{ id: 1, next_code: 10000 }]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_code_sequence');
    await queryInterface.changeColumn('products', 'code', { type: Sequelize.STRING(64), allowNull: false });
  },
};
