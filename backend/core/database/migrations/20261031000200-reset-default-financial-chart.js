'use strict';

const { randomUUID } = require('node:crypto');

const groups = [
  ['1', 'دارایی‌ها', 'ASSET'], ['2', 'بدهی‌ها', 'LIABILITY'],
  ['3', 'حقوق صاحبان سهام', 'EQUITY'], ['4', 'درآمدها', 'REVENUE'],
  ['5', 'هزینه‌ها', 'EXPENSE'], ['6', 'حساب‌های انتظامی و آماری', 'MEMORANDUM'],
];

// Each node is [name, children?]. A code map retains the identifiers used by
// posting services; the remaining codes are generated uniquely during seeding.
const tree = [
  ['دارایی‌ها', [
    ['دارایی‌های جاری', [
      ['موجودی نقد و بانک', [
        ['صندوق'], ['تنخواه‌گردان'], ['بانک‌ها', [['بانک جاری'], ['بانک پس‌انداز'], ['بانک کوتاه‌مدت']]],
      ]],
      ['حساب‌های دریافتنی', [['حساب‌های دریافتنی تجاری'], ['اسناد دریافتنی'], ['ذخیره مطالبات مشکوک‌الوصول']]],
      ['موجودی مواد و کالا', [['مواد اولیه'], ['کالای در جریان ساخت'], ['کالای ساخته‌شده']]],
      ['پیش‌پرداخت‌ها و سفارشات', [['پیش‌پرداخت به تأمین‌کنندگان'], ['هزینه‌های پرداخت‌شده از پیش']]],
      ['سایر دارایی‌های جاری', [['مالیات بر ارزش افزوده (اعتبار)'], ['اعتبار مالیاتی']]],
    ]],
    ['دارایی‌های غیرجاری (ثابت)', [
      ['دارایی‌های ثابت مشهود', [['زمین'], ['ساختمان'], ['ماشین‌آلات و تجهیزات'], ['وسایل نقلیه'], ['اثاثه و منصوبات'], ['استهلاک انباشته (کاهنده)']]],
      ['دارایی‌های ثابت نامشهود', [['سرقفلی'], ['حق امتیاز و علائم تجاری'], ['نرم‌افزارها']]],
      ['سرمایه‌گذاری‌های بلندمدت', [['سرمایه‌گذاری در سهام'], ['سرمایه‌گذاری در اوراق قرضه']]],
      ['سایر دارایی‌های غیرجاری', [['دارایی‌های اجاره‌ای']]],
    ]],
  ]],
  ['بدهی‌ها', [
    ['بدهی‌های جاری', [
      ['حساب‌های پرداختنی', [['حساب‌های پرداختنی تجاری'], ['اسناد پرداختنی']]],
      ['بدهی‌های حقوق و دستمزد', [['حقوق پرداختنی'], ['بیمه پرداختنی'], ['مالیات بر درآمد حقوق پرداختنی']]],
      ['بدهی‌های مالیاتی', [['مالیات بر ارزش افزوده (بدهی)'], ['مالیات عملکرد پرداختنی']]],
      ['پیش‌دریافت‌ها', [['پیش‌دریافت از مشتریان']]],
      ['تسهیلات و وام‌های کوتاه‌مدت', [['وام بانکی کوتاه‌مدت'], ['تسهیلات مالی']]],
    ]],
    ['بدهی‌های غیرجاری (بلندمدت)', [['وام‌های بلندمدت', [['وام بانکی بلندمدت']]], ['اوراق قرضه پرداختنی'], ['ذخیره مزایای پایان خدمت کارکنان'], ['بدهی‌های اجاره‌ای بلندمدت']]],
  ]],
  ['حقوق صاحبان سهام', [['سرمایه', [['سرمایه اولیه'], ['سرمایه اضافه‌شده']]], ['اندوخته‌ها', [['اندوخته قانونی'], ['اندوخته اختیاری']]], ['سود و زیان انباشته', [['سود انباشته'], ['زیان انباشته (کاهنده)']]], ['برداشت‌های مالک (کاهنده)']]],
  ['درآمدها', [['درآمدهای عملیاتی', [['فروش کالا'], ['درآمد خدمات'], ['برگشت از فروش و تخفیفات (کاهنده)']]], ['درآمدهای غیرعملیاتی', [['سود سپرده بانکی'], ['سود فروش دارایی‌ها'], ['درآمد اجاره'], ['سود سهام دریافتی'], ['سایر درآمدها'], ['درآمد متفرقه']]]]],
  ['هزینه‌ها', [['بهای تمام‌شده', [['بهای تمام‌شده کالای فروش‌رفته'], ['بهای تمام‌شده خدمات']]], ['هزینه‌های عملیاتی', [['هزینه‌های فروش و بازاریابی', [['تبلیغات'], ['حمل و نقل فروش'], ['کمیسیون فروش']]], ['هزینه‌های اداری و عمومی', [['حقوق و دستمزد اداری'], ['اجاره اداری'], ['آب، برق، گاز و تلفن'], ['لوازم مصرفی'], ['هزینه‌های پذیرایی و سفر'], ['هزینه استهلاک']]]]], ['هزینه‌های مالی', [['هزینه بهره و کارمزد بانکی'], ['هزینه تسهیلات مالی']]], ['سایر هزینه‌ها', [['جرایم و خسارات'], ['هزینه‌های متفرقه'], ['زیان فروش دارایی‌ها']]]]],
  ['حساب‌های انتظامی و آماری', [['ضمانت‌نامه‌ها'], ['اسناد تضمینی نزد بانک'], ['امانات و ودیعه‌ها'], ['حساب‌های انتظامی خرید و فروش']]],
];

const fixedCodes = new Map([
  ['موجودی نقد و بانک', ['1000', 'ASSET', 0]], ['بانک‌ها', ['1010', 'ASSET', 0]],
  ['حساب‌های دریافتنی تجاری', ['1100', 'ASSET', 1]], ['کالای ساخته‌شده', ['1200', 'ASSET', 1]],
  ['کالای در جریان ساخت', ['1300', 'ASSET', 1]], ['استهلاک انباشته (کاهنده)', ['1500', 'ASSET', 1]],
  ['زمین', ['1600', 'ASSET', 1]], ['حساب‌های پرداختنی تجاری', ['2000', 'LIABILITY', 1]],
  ['مالیات بر ارزش افزوده (بدهی)', ['2100', 'LIABILITY', 1]], ['اسناد پرداختنی', ['2110', 'LIABILITY', 1]],
  ['سرمایه اولیه', ['3000', 'EQUITY', 1]], ['فروش کالا', ['4000', 'REVENUE', 1]],
  ['برگشت از فروش و تخفیفات (کاهنده)', ['4010', 'REVENUE', 1]], ['سود فروش دارایی‌ها', ['4100', 'REVENUE', 1]],
  ['درآمد متفرقه', ['4200', 'REVENUE', 1]], ['بهای تمام‌شده کالای فروش‌رفته', ['5000', 'EXPENSE', 1]],
  ['بهای تمام‌شده خدمات', ['5100', 'EXPENSE', 1]], ['هزینه بهره و کارمزد بانکی', ['5200', 'EXPENSE', 1]],
  ['هزینه‌های متفرقه', ['5300', 'EXPENSE', 1]], ['هزینه استهلاک', ['6000', 'EXPENSE', 1]],
  ['هزینه‌های اداری و عمومی', ['6100', 'EXPENSE', 0]], ['حقوق و دستمزد اداری', ['6200', 'EXPENSE', 1]],
]);

module.exports = {
  async up(q, S) {
    const now = new Date();

    // Clear demo ledger history and nullable references before replacing its accounts.
    const [entryRefs] = await q.sequelize.query(`SELECT k.TABLE_NAME, k.COLUMN_NAME, c.IS_NULLABLE FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_SCHEMA=k.TABLE_SCHEMA AND c.TABLE_NAME=k.TABLE_NAME AND c.COLUMN_NAME=k.COLUMN_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME='journal_entries'`);
    for (const ref of entryRefs) {
      if (ref.TABLE_NAME === 'journal_lines') continue;
      if (ref.IS_NULLABLE === 'YES') await q.sequelize.query(`UPDATE \`${ref.TABLE_NAME}\` SET \`${ref.COLUMN_NAME}\` = NULL WHERE \`${ref.COLUMN_NAME}\` IS NOT NULL`);
      else await q.sequelize.query(`DELETE FROM \`${ref.TABLE_NAME}\``);
    }
    await q.sequelize.query('DELETE FROM journal_lines');
    await q.sequelize.query('DELETE FROM journal_entries');

    // Retain an existing treasury account, but discard all other demo chart rows.
    const [accountRefs] = await q.sequelize.query(`SELECT k.TABLE_NAME, k.COLUMN_NAME, c.IS_NULLABLE FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_SCHEMA=k.TABLE_SCHEMA AND c.TABLE_NAME=k.TABLE_NAME AND c.COLUMN_NAME=k.COLUMN_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME='financial_accounts' AND k.TABLE_NAME <> 'financial_accounts'`);
    for (const ref of accountRefs) {
      if (ref.TABLE_NAME === 'treasury_accounts') continue;
      if (ref.IS_NULLABLE === 'YES') await q.sequelize.query(`UPDATE \`${ref.TABLE_NAME}\` SET \`${ref.COLUMN_NAME}\` = NULL WHERE \`${ref.COLUMN_NAME}\` IS NOT NULL`);
      else await q.sequelize.query(`DELETE FROM \`${ref.TABLE_NAME}\``);
    }
    await q.sequelize.query('DELETE FROM erp_domain_seeded_accounts');
    const [treasury] = await q.sequelize.query('SELECT financial_account_id FROM treasury_accounts');
    const retainedIds = treasury.map((row) => row.financial_account_id);
    for (const id of retainedIds) await q.sequelize.query('UPDATE financial_accounts SET parent_id = NULL WHERE id = :id', { replacements: { id } });
    // Remove all old chart nodes bottom-up, except financial accounts owned by treasury.
    while (true) {
      const [leaves] = await q.sequelize.query(`SELECT a.id FROM financial_accounts a LEFT JOIN financial_accounts c ON c.parent_id = a.id WHERE c.id IS NULL`);
      const removable = leaves.map((row) => row.id).filter((id) => !retainedIds.includes(id));
      if (!removable.length) break;
      for (const id of removable) await q.sequelize.query('DELETE FROM financial_accounts WHERE id = :id', { replacements: { id } });
    }
    if (retainedIds.length) {
      await q.sequelize.query('UPDATE financial_accounts SET parent_id = NULL, is_group_root = 0');
    }

    await q.changeColumn('financial_accounts', 'account_type', { type: S.STRING(12), allowNull: false });
    const groupIds = new Map();
    for (const [code, name, type] of groups) {
      const [existing] = await q.sequelize.query('SELECT id FROM financial_accounts WHERE code = :code', { replacements: { code } });
      const id = existing[0]?.id || randomUUID();
      groupIds.set(type, id);
      if (existing.length) await q.sequelize.query('UPDATE financial_accounts SET name=:name, account_type=:type, parent_id=NULL, is_group_root=1, is_system=1, is_postable=0, is_active=1 WHERE id=:id', { replacements: { id, name, type } });
      else await q.bulkInsert('financial_accounts', [{ id, code, name, account_type: type, parent_id: null, is_group_root: 1, is_system: 1, is_postable: 0, is_active: 1, created_at: now, updated_at: now }]);
    }

    const usedCodes = new Set(groups.map(([code]) => code));
    let serial = 1;
    const add = async (node, parentId, inheritedType, root = false) => {
      const [name, children] = node;
      let type = inheritedType;
      let isPostable = children?.length ? 0 : 1;
      let code;
      if (root) {
        code = groups.find((group) => group[1] === name)[0];
        type = groups.find((group) => group[1] === name)[2];
      } else if (fixedCodes.has(name)) {
        [code, type, isPostable] = fixedCodes.get(name);
      } else {
        do { code = `DF-${String(serial++).padStart(4, '0')}`; } while (usedCodes.has(code));
      }
      usedCodes.add(code);
      let id = root ? groupIds.get(type) : randomUUID();
      if (!root) await q.bulkInsert('financial_accounts', [{ id, code, name, account_type: type, parent_id: parentId, is_group_root: 0, is_system: 1, is_postable: isPostable, is_active: 1, created_at: now, updated_at: now }]);
      if (children) for (const child of children) await add(child, id, type);
      return id;
    };
    for (const root of tree) await add(root, null, null, true);

    if (retainedIds.length) {
      const cashId = (await q.sequelize.query("SELECT id FROM financial_accounts WHERE code='1000'"))[0][0].id;
      for (const id of retainedIds) await q.sequelize.query('UPDATE financial_accounts SET parent_id=:parentId, account_type=\'ASSET\', is_group_root=0, is_postable=1 WHERE id=:id', { replacements: { parentId: cashId, id } });
    }
  },

  async down() {
    throw new Error('بازگردانی این مهاجرت ممکن نیست؛ ساختار حساب‌ها و داده‌های نمایشی قبلی حذف شده‌اند.');
  },
};
