'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [partners] = await queryInterface.sequelize.query(
      'SELECT id FROM commercial_partners ORDER BY created_at ASC, id ASC',
    );
    if (partners.length > 90000) {
      throw new Error('Commercial partner code range 10000-99999 is exhausted');
    }

    await queryInterface.createTable('commercial_partner_code_sequence', {
      id: { type: Sequelize.TINYINT, primaryKey: true, allowNull: false },
      next_code: { type: Sequelize.INTEGER, allowNull: false },
    });

    await queryInterface.sequelize.transaction(async (transaction) => {
      for (let index = 0; index < partners.length; index += 1) {
        await queryInterface.sequelize.query(
          'UPDATE commercial_partners SET code = :code WHERE id = :id',
          {
            replacements: { code: `__PARTNER_RENUMBER_${index}__`, id: partners[index].id },
            transaction,
          },
        );
      }

      for (let index = 0; index < partners.length; index += 1) {
        await queryInterface.sequelize.query(
          'UPDATE commercial_partners SET code = :code WHERE id = :id',
          {
            replacements: { code: String(10000 + index), id: partners[index].id },
            transaction,
          },
        );
      }

      await queryInterface.bulkInsert(
        'commercial_partner_code_sequence',
        [{ id: 1, next_code: partners.length >= 90000 ? 10000 : 10000 + partners.length }],
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('commercial_partner_code_sequence');
  },
};
