'use strict';

module.exports = {
  async up(q, S) {
    await q.addColumn('treasury_accounts', 'card_number', { type: S.STRING(19), allowNull: true });
  },
  async down(q) {
    await q.removeColumn('treasury_accounts', 'card_number');
  },
};
