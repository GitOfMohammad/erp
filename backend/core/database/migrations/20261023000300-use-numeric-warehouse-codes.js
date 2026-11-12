'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [warehouses] = await queryInterface.sequelize.query(
        'SELECT id FROM warehouses ORDER BY created_at ASC, id ASC',
        { transaction },
      );

      if (warehouses.length > 900) {
        throw new Error('Warehouse code range 100-999 is exhausted');
      }

      for (let index = 0; index < warehouses.length; index += 1) {
        await queryInterface.sequelize.query(
          'UPDATE warehouses SET code = :code WHERE id = :id',
          {
            replacements: { code: `__WH_RENUMBER_${index}__`, id: warehouses[index].id },
            transaction,
          },
        );
      }

      for (let index = 0; index < warehouses.length; index += 1) {
        await queryInterface.sequelize.query(
          'UPDATE warehouses SET code = :code WHERE id = :id',
          {
            replacements: { code: String(100 + index), id: warehouses[index].id },
            transaction,
          },
        );
      }

      await queryInterface.sequelize.query(
        'UPDATE warehouse_code_sequence SET next_code = :nextCode WHERE id = 1',
        { replacements: { nextCode: warehouses.length >= 900 ? 100 : 100 + warehouses.length }, transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [warehouses] = await queryInterface.sequelize.query(
        'SELECT id FROM warehouses ORDER BY created_at ASC, id ASC',
        { transaction },
      );
      for (let index = 0; index < warehouses.length; index += 1) {
        await queryInterface.sequelize.query(
          'UPDATE warehouses SET code = :code WHERE id = :id',
          {
            replacements: { code: `__WH_RENUMBER_${index}__`, id: warehouses[index].id },
            transaction,
          },
        );
      }
      for (let index = 0; index < warehouses.length; index += 1) {
        await queryInterface.sequelize.query(
          'UPDATE warehouses SET code = :code WHERE id = :id',
          {
            replacements: { code: `WH-${String(index + 1).padStart(5, '0')}`, id: warehouses[index].id },
            transaction,
          },
        );
      }
      await queryInterface.sequelize.query(
        'UPDATE warehouse_code_sequence SET next_code = 1 WHERE id = 1',
        { transaction },
      );
    });
  },
};
