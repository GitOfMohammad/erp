'use strict';

module.exports = {
  async up(q, S) {
    await q.addColumn('treasury_accounts', 'description', { type: S.TEXT, allowNull: true });
    await q.addColumn('treasury_accounts', 'branch_name', { type: S.STRING(100), allowNull: true });
    await q.addColumn('treasury_accounts', 'branch_code', { type: S.STRING(20), allowNull: true });
    await q.addColumn('treasury_accounts', 'bank_address', { type: S.STRING(300), allowNull: true });
    await q.addColumn('treasury_accounts', 'bank_phone', { type: S.STRING(30), allowNull: true });
  },
  async down(q) {
    for (const column of ['bank_phone', 'bank_address', 'branch_code', 'branch_name', 'description']) {
      await q.removeColumn('treasury_accounts', column);
    }
  },
};
