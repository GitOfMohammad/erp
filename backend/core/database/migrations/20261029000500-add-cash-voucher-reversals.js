'use strict';
module.exports = {
  async up(q, S) {
    await q.addColumn('financial_cash_vouchers', 'reverses_voucher_id', {
      type: S.UUID, allowNull: true, unique: true,
      references: { model: 'financial_cash_vouchers', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    });
  },
  async down(q) { await q.removeColumn('financial_cash_vouchers', 'reverses_voucher_id'); },
};
