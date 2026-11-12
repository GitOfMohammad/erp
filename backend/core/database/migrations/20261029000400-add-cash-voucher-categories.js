'use strict';
const { randomUUID } = require('node:crypto');
const accounts = [
  ['1400', 'پیش‌پرداخت به تأمین‌کنندگان', 'ASSET'],
  ['2010', 'وام‌های پرداختنی', 'LIABILITY'],
  ['2020', 'پیش‌دریافت از مشتریان', 'LIABILITY'],
  ['3010', 'آورده و سرمایه مالک', 'EQUITY'],
  ['4200', 'سایر درآمدها', 'REVENUE'],
  ['6100', 'هزینه‌های عمومی و اداری', 'EXPENSE'],
  ['6200', 'هزینه حقوق و دستمزد', 'EXPENSE'],
];
module.exports = {
  async up(q, S) {
    await q.addColumn('financial_cash_vouchers', 'category', { type: S.STRING(30), allowNull: false, defaultValue: 'GENERAL_EXPENSE' });
    const now = new Date();
    for (const [code, name, account_type] of accounts) {
      const [rows] = await q.sequelize.query('SELECT id, account_type FROM financial_accounts WHERE code = :code', { replacements: { code } });
      if (rows.length && rows[0].account_type !== account_type) throw new Error(`نوع حساب ${code} با کاربرد مورد انتظار ناسازگار است`);
      if (rows.length) continue;
      const id = randomUUID();
      await q.bulkInsert('financial_accounts', [{ id, code, name, account_type, parent_id: null, is_system: 1, is_postable: 1, is_active: 1, created_at: now, updated_at: now }]);
      await q.bulkInsert('erp_domain_seeded_accounts', [{ code, account_id: id, created_at: now, updated_at: now }]);
    }
  },
  async down(q) {
    await q.removeColumn('financial_cash_vouchers', 'category');
    for (const [code] of accounts) {
      const [rows] = await q.sequelize.query('SELECT account_id FROM erp_domain_seeded_accounts WHERE code = :code', { replacements: { code } });
      if (!rows.length) continue;
      const [used] = await q.sequelize.query('SELECT COUNT(*) AS total FROM journal_lines WHERE account_id = :id', { replacements: { id: rows[0].account_id } });
      if (Number(used[0].total) > 0) throw new Error(`نمی‌توان حساب ${code} را حذف کرد؛ در دفتر کل استفاده شده است`);
      await q.bulkDelete('erp_domain_seeded_accounts', { code });
      await q.bulkDelete('financial_accounts', { id: rows[0].account_id });
    }
  },
};
