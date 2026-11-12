'use strict';

module.exports = {
  async up(q, S) {
    await q.changeColumn('treasury_accounts', 'account_type', { type: S.STRING(16), allowNull: false });
    await q.addColumn('treasury_accounts', 'custodian_name', { type: S.STRING(150), allowNull: true });
    await q.addColumn('treasury_accounts', 'limit_amount', { type: S.DECIMAL(18, 0), allowNull: true });
  },
  async down(q, S) {
    const [rows] = await q.sequelize.query("SELECT COUNT(*) AS total FROM treasury_accounts WHERE account_type = 'PETTY_CASH'");
    if (Number(rows[0]?.total || 0) > 0) throw new Error('تنخواه ثبت‌شده وجود دارد؛ برای جلوگیری از حذف داده، ابتدا تنخواه‌ها را حذف کنید.');
    await q.removeColumn('treasury_accounts', 'limit_amount');
    await q.removeColumn('treasury_accounts', 'custodian_name');
    await q.changeColumn('treasury_accounts', 'account_type', { type: S.STRING(4), allowNull: false });
  },
};
