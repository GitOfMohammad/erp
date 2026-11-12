'use strict';

module.exports = {
  async up(q, S) {
    await q.addColumn('financial_cash_vouchers', 'method_details', { type: S.JSON, allowNull: true });
  },
  async down(q) {
    await q.removeColumn('financial_cash_vouchers', 'method_details');
  },
};
