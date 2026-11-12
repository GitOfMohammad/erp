'use strict';

const { randomUUID } = require('node:crypto');

const groups = [
  ['1', 'دارایی‌ها', 'ASSET'],
  ['2', 'بدهی‌ها', 'LIABILITY'],
  ['3', 'حقوق مالکانه', 'EQUITY'],
  ['4', 'درآمدها', 'REVENUE'],
  ['5', 'هزینه‌ها', 'EXPENSE'],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('financial_accounts', 'is_group_root', {
      type: Sequelize.TINYINT, allowNull: false, defaultValue: 0,
    });

    const now = new Date();
    const ids = new Map();
    for (const [code, name, account_type] of groups) {
      const id = randomUUID();
      ids.set(account_type, id);
      await queryInterface.bulkInsert('financial_accounts', [{
        id, code, name, account_type, parent_id: null, is_system: 1,
        is_group_root: 1, is_postable: 0, is_active: 1,
        created_at: now, updated_at: now,
      }]);
    }

    for (const [account_type, id] of ids) {
      await queryInterface.sequelize.query(
        'UPDATE financial_accounts SET parent_id = :parentId WHERE account_type = :accountType AND parent_id IS NULL AND is_group_root = 0',
        { replacements: { parentId: id, accountType: account_type } },
      );
    }
  },

  async down(queryInterface) {
    for (const [code] of groups) {
      await queryInterface.sequelize.query(
        'UPDATE financial_accounts SET parent_id = NULL WHERE parent_id = (SELECT id FROM (SELECT id FROM financial_accounts WHERE code = :code) AS roots)',
        { replacements: { code } },
      );
    }
    await queryInterface.bulkDelete('financial_accounts', { code: groups.map(([code]) => code) });
    await queryInterface.removeColumn('financial_accounts', 'is_group_root');
  },
};
