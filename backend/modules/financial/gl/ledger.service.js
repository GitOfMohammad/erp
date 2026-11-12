const crypto = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../../core/database/db');
const ErrorApi = require('../../../core/api/ErrorApi');
const { FinancialAccount, JournalEntry, JournalLine, TreasuryAccount, FiscalYear } = require('../../../core/database/models');

const plain = (value) => value?.get ? value.get({ plain: true }) : value;
const today = () => new Date().toISOString().slice(0, 10);
const dateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;
function amount(value, field = 'amount') {
  if (!/^(0|[1-9][0-9]{0,17})$/.test(String(value))) throw ErrorApi.badRequest(`${field} باید مبلغ صحیح ریالی باشد`);
  return BigInt(value);
}
function journalNumber() { return `GL-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }
function includeLines() { return [{ model: JournalLine, as: 'lines', include: [{ model: FinancialAccount, as: 'account', attributes: ['id', 'code', 'name', 'account_type'] }, { model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'account_type'] }] }]; }

async function getSystemAccount(code, transaction) {
  const account = await FinancialAccount.findOne({ where: { code, is_active: 1, is_postable: 1 }, transaction, lock: transaction?.LOCK.UPDATE });
  if (!account) throw ErrorApi.internalServerError(`حساب سیستمی ${code} تعریف نشده است`);
  return account;
}

async function createPostedEntry({ sourceType, sourceId, entryDate = today(), description, createdBy, lines, transaction }) {
  if (sourceType !== 'FISCAL_CLOSE') {
    const closed = await FiscalYear.findOne({ where: { status: 'CLOSED', start_date: { [Op.lte]: dateOnly(entryDate) }, end_date: { [Op.gte]: dateOnly(entryDate) } }, transaction, lock: transaction.LOCK.UPDATE });
    if (closed) throw ErrorApi.conflict(`دورهٔ مالی ${closed.name} بسته شده است؛ ثبت سند در این بازه مجاز نیست`);
  }
  if (!Array.isArray(lines) || lines.length < 2) throw ErrorApi.badRequest('سند حسابداری باید حداقل دو ردیف داشته باشد');
  let debits = 0n; let credits = 0n;
  const prepared = [];
  for (const line of lines) {
    const debit = amount(line.debit ?? '0', 'بدهکار');
    const credit = amount(line.credit ?? '0', 'بستانکار');
    if ((debit === 0n) === (credit === 0n)) throw ErrorApi.badRequest('هر ردیف باید فقط یکی از مبلغ بدهکار یا بستانکار را داشته باشد');
    debits += debit; credits += credit;
    let account = line.accountId ? await FinancialAccount.findByPk(line.accountId, { transaction, lock: transaction.LOCK.UPDATE }) : await getSystemAccount(line.accountCode, transaction);
    if (!account || Number(account.is_active) !== 1 || Number(account.is_postable) !== 1) throw ErrorApi.badRequest('حساب انتخاب‌شده فعال یا قابل ثبت نیست');
    const mappedTreasury = await TreasuryAccount.findOne({ where: { financial_account_id: account.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (mappedTreasury && line.treasuryAccountId !== mappedTreasury.id) throw ErrorApi.badRequest('برای ثبت روی حساب بانک یا صندوق باید خود حساب خزانه انتخاب شود');
    if (line.treasuryAccountId) {
      const treasury = await TreasuryAccount.findByPk(line.treasuryAccountId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!treasury || treasury.financial_account_id !== account.id) throw ErrorApi.badRequest('حساب خزانه با سرفصل حسابداری تطابق ندارد');
    }
    prepared.push({ account_id: account.id, partner_id: line.partnerId || null, treasury_account_id: line.treasuryAccountId || null, debit: debit.toString(), credit: credit.toString(), description: line.description || null });
  }
  if (debits === 0n || debits !== credits) throw ErrorApi.badRequest('جمع بدهکار و بستانکار سند باید برابر و بزرگ‌تر از صفر باشد', { debit: debits.toString(), credit: credits.toString() });
  const existing = await JournalEntry.findOne({ where: { source_type: sourceType, source_id: sourceId }, include: includeLines(), transaction, lock: transaction.LOCK.UPDATE });
  if (existing) return existing;
  const entry = await JournalEntry.create({ entry_no: journalNumber(), source_type: sourceType, source_id: sourceId, entry_date: entryDate, description, status: 'POSTED', created_by: createdBy, posted_at: new Date() }, { transaction });
  await JournalLine.bulkCreate(prepared.map((line) => ({ ...line, journal_entry_id: entry.id })), { transaction });
  return JournalEntry.findByPk(entry.id, { include: includeLines(), transaction });
}

async function previewFiscalClose({ name, startDate, endDate, retainedEarningsAccountId, transaction }) {
  if (startDate > endDate) throw ErrorApi.badRequest('تاریخ شروع باید پیش از تاریخ پایان باشد');
  const overlaps = await FiscalYear.findOne({ where: { start_date: { [Op.lte]: endDate }, end_date: { [Op.gte]: startDate } }, transaction, lock: transaction?.LOCK.UPDATE });
  if (overlaps) throw ErrorApi.conflict(`این بازه با دورهٔ بسته‌شدهٔ ${overlaps.name} هم‌پوشانی دارد`);
  const retained = await FinancialAccount.findByPk(retainedEarningsAccountId, { transaction, lock: transaction?.LOCK.UPDATE });
  if (!retained || retained.account_type !== 'EQUITY' || Number(retained.is_active) !== 1 || Number(retained.is_postable) !== 1) throw ErrorApi.badRequest('حساب مقصد باید حساب تفصیلی فعال از گروه حقوق صاحبان سهام باشد');
  const rows = await financialTotals({ from: startDate, to: endDate, accountTypes: ['REVENUE', 'EXPENSE'], transaction });
  const lines = [];
  let debits = 0n; let credits = 0n;
  for (const row of rows) {
    const net = row.account_type === 'REVENUE' ? row.credit_total - row.debit_total : row.debit_total - row.credit_total;
    if (net === 0n) continue;
    const debit = row.account_type === 'REVENUE' ? net : -net;
    const line = { accountId: row.id, accountName: row.name, accountCode: row.code, debit: debit > 0n ? debit.toString() : '0', credit: debit < 0n ? (-debit).toString() : '0' };
    debits += BigInt(line.debit); credits += BigInt(line.credit); lines.push(line);
  }
  const netIncome = rows.filter((row) => row.account_type === 'REVENUE').reduce((sum, row) => sum + row.credit_total - row.debit_total, 0n)
    - rows.filter((row) => row.account_type === 'EXPENSE').reduce((sum, row) => sum + row.debit_total - row.credit_total, 0n);
  if (netIncome > 0n) { lines.push({ accountId: retained.id, accountName: retained.name, accountCode: retained.code, debit: '0', credit: netIncome.toString() }); credits += netIncome; }
  else if (netIncome < 0n) { lines.push({ accountId: retained.id, accountName: retained.name, accountCode: retained.code, debit: (-netIncome).toString(), credit: '0' }); debits += -netIncome; }
  return { name, startDate, endDate, retainedEarningsAccount: { id: retained.id, code: retained.code, name: retained.name }, netIncome: netIncome.toString(), lines, totalDebit: debits.toString(), totalCredit: credits.toString(), balanced: debits === credits };
}
async function closeFiscalYear(data, userId) {
  return sequelize.transaction(async (transaction) => {
    const preview = await previewFiscalClose({ ...data, transaction });
    if (!preview.balanced) throw ErrorApi.conflict('سند اختتامیه تراز نیست و دوره بسته نشد');
    if (preview.lines.length === 0) throw ErrorApi.conflict('در این بازه گردش درآمد یا هزینه‌ای برای بستن وجود ندارد');
    const fiscalYear = await FiscalYear.create({ name: data.name, start_date: data.startDate, end_date: data.endDate, status: 'CLOSED', closed_by: userId, closed_at: new Date() }, { transaction });
    const lines = await Promise.all(preview.lines.map(async (line) => {
      const treasuryAccount = await TreasuryAccount.findOne({ where: { financial_account_id: line.accountId }, transaction, lock: transaction.LOCK.UPDATE });
      return { accountId: line.accountId, treasuryAccountId: treasuryAccount?.id, debit: line.debit, credit: line.credit };
    }));
    const entry = await createPostedEntry({ sourceType: 'FISCAL_CLOSE', sourceId: fiscalYear.id, entryDate: data.endDate, description: `سند اختتامیه ${data.name}`, createdBy: userId, lines, transaction });
    await fiscalYear.update({ closing_journal_entry_id: entry.id }, { transaction });
    return { ...preview, id: fiscalYear.id, status: 'CLOSED', closingJournalEntryId: entry.id, closedAt: fiscalYear.closed_at };
  });
}
async function listFiscalYears() { return (await FiscalYear.findAll({ order: [['start_date', 'DESC']] })).map(plain); }

async function listAccounts({ page, limit, search, accountType, is_active }) {
  const where = {};
  if (accountType) where.account_type = accountType;
  if (is_active !== undefined) where.is_active = is_active;
  if (search) where[Op.or] = [{ code: { [Op.like]: `%${search}%` } }, { name: { [Op.like]: `%${search}%` } }];
  const result = await FinancialAccount.findAndCountAll({ where, include: [{ model: FinancialAccount, as: 'parent', attributes: ['id', 'code', 'name'] }], limit, offset: (page - 1) * limit, order: [['code', 'ASC']] });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function generateAccountCode(accountType, parent, transaction) {
  const siblings = await FinancialAccount.findAll({ where: { account_type: accountType, parent_id: parent?.id ?? null }, attributes: ['code'], transaction, lock: transaction.LOCK.UPDATE });
  const siblingCodes = siblings.map((item) => String(item.code));
  if (Number(parent?.is_group_root) === 1) {
    const numericCodes = siblingCodes.filter((code) => /^\d{4,}$/.test(code)).map(Number);
    let candidate = String(Math.max(...numericCodes, Number(parent.code) * 1000 - 10) + 10);
    while (await FinancialAccount.findOne({ where: { code: candidate }, transaction })) candidate = String(Number(candidate) + 10);
    if (candidate.length > 26) throw ErrorApi.conflict('ظرفیت کدگذاری این گروه حساب تکمیل شده است');
    return candidate;
  }
  if (!parent) {
    const numericCodes = siblingCodes.filter((code) => /^\d{4,}$/.test(code)).map(Number);
    let candidate = String(Math.max(...numericCodes, 999) + 1);
    while (await FinancialAccount.findOne({ where: { code: candidate }, transaction })) candidate = String(Number(candidate) + 1);
    if (candidate.length > 26) throw ErrorApi.conflict('ظرفیت کدگذاری این گروه حساب تکمیل شده است');
    return candidate;
  }
  const prefix = String(parent.code);
  if (prefix.length + 3 > 26) throw ErrorApi.conflict('برای این حساب امکان ایجاد زیرحساب جدید وجود ندارد');
  const numericPrefix = /^\d+$/.test(prefix);
  const sequenceFor = (code) => {
    const suffix = numericPrefix ? (code.startsWith(prefix) ? code.slice(prefix.length) : '') : (code.startsWith(`${prefix}-`) ? code.slice(prefix.length + 1) : '');
    return /^\d{2}$/.test(suffix) ? Number(suffix) : 0;
  };
  let sequence = Math.max(0, ...siblingCodes.map(sequenceFor)) + 1;
  if (sequence > 99) throw ErrorApi.conflict('ظرفیت کدگذاری زیرحساب‌های این حساب تکمیل شده است');
  let candidate = numericPrefix ? `${prefix}${String(sequence).padStart(2, '0')}` : `${prefix}-${String(sequence).padStart(2, '0')}`;
  while (await FinancialAccount.findOne({ where: { code: candidate }, transaction })) {
    sequence += 1;
    if (sequence > 99) throw ErrorApi.conflict('ظرفیت کدگذاری زیرحساب‌های این حساب تکمیل شده است');
    candidate = numericPrefix ? `${prefix}${String(sequence).padStart(2, '0')}` : `${prefix}-${String(sequence).padStart(2, '0')}`;
  }
  return candidate;
}
async function createAccount(data) {
  return sequelize.transaction(async (transaction) => {
    const parent = await FinancialAccount.findByPk(data.parentId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!parent || Number(parent.is_active) !== 1) throw ErrorApi.badRequest('حساب والد باید فعال باشد');
    const accountType = parent.account_type;
    if (data.accountType && data.accountType !== accountType) throw ErrorApi.badRequest('ماهیت حساب از گروه اصلی به‌صورت سیستمی تعیین می‌شود');
    let parentDepth = 0;
    let ancestor = parent;
    while (ancestor && Number(ancestor.is_group_root) !== 1) {
      parentDepth += 1;
      ancestor = ancestor.parent_id ? await FinancialAccount.findByPk(ancestor.parent_id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
    }
    if (parentDepth >= 5) throw ErrorApi.badRequest('حداکثر سطح حساب تفصیلی است');
    if (Number(parent.is_postable) === 1) await parent.update({ is_postable: 0 }, { transaction });
    const code = await generateAccountCode(accountType, parent, transaction);
    return plain(await FinancialAccount.create({ code, name: data.name, account_type: accountType, parent_id: parent.id, is_system: 0, is_postable: 1, is_active: 1 }, { transaction }));
  });
}
async function updateAccount(id, data) {
  const account = await FinancialAccount.findByPk(id);
  if (!account) throw ErrorApi.notFound('حساب پیدا نشد');
  if (Number(account.is_group_root) === 1) throw ErrorApi.conflict('گروه‌های اصلی ثابت هستند و قابل ویرایش نیستند');
  if (data.isActive !== undefined) throw ErrorApi.conflict('فقط نام حساب قابل ویرایش است');
  if (Number(account.is_system) === 1 && data.isActive !== undefined) throw ErrorApi.conflict('وضعیت حساب‌های سیستمی قابل تغییر نیست');
  if (data.name !== undefined) await account.update({ name: data.name });
  return plain(account);
}
async function deleteAccount(id) {
  return sequelize.transaction(async (transaction) => {
    const account = await FinancialAccount.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!account) throw ErrorApi.notFound('حساب پیدا نشد');
    if (Number(account.is_group_root) === 1) throw ErrorApi.conflict('گروه‌های اصلی قابل حذف نیستند');

    const children = await FinancialAccount.count({ where: { parent_id: account.id }, transaction });
    if (children) throw ErrorApi.conflict('ابتدا زیرحساب‌های این حساب را حذف کنید');

    const hasMovements = await JournalLine.count({ where: { account_id: account.id }, transaction });
    if (hasMovements) throw ErrorApi.conflict('این حساب گردش دارد و قابل حذف نیست');

    const treasuryLink = await TreasuryAccount.count({ where: { financial_account_id: account.id }, transaction });
    const cashVoucherLink = await CashVoucher.count({ where: { counterpart_account_id: account.id }, transaction });
    const [budgetRows] = await sequelize.query('SELECT COUNT(*) AS total FROM financial_budget_lines WHERE account_id = :id', { replacements: { id: account.id }, transaction });
    const [projectRows] = await sequelize.query('SELECT COUNT(*) AS total FROM project_expenses WHERE account_id = :id', { replacements: { id: account.id }, transaction });
    if (treasuryLink || cashVoucherLink || Number(budgetRows[0].total) || Number(projectRows[0].total)) {
      throw ErrorApi.conflict('این حساب به اطلاعات خزانه، اسناد یا بودجه متصل است و قابل حذف نیست');
    }

    await sequelize.query('DELETE FROM erp_domain_seeded_accounts WHERE account_id = :id', { replacements: { id: account.id }, transaction });
    await account.destroy({ transaction });
    return { id: account.id };
  });
}
async function getJournal(id) { const entry = await JournalEntry.findByPk(id, { include: includeLines() }); if (!entry) throw ErrorApi.notFound('سند حسابداری پیدا نشد'); return plain(entry); }
async function listJournalEntries({ page, limit, from, to, sourceType }) {
  const where = { status: 'POSTED' };
  if (sourceType) where.source_type = sourceType;
  if (from || to) where.entry_date = { ...(from ? { [Op.gte]: dateOnly(from) } : {}), ...(to ? { [Op.lte]: dateOnly(to) } : {}) };
  const result = await JournalEntry.findAndCountAll({ where, include: includeLines(), distinct: true, limit, offset: (page - 1) * limit, order: [['entry_date', 'DESC'], ['created_at', 'DESC']] });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function createManualEntry(data, userId) {
  return sequelize.transaction(async (transaction) => {
    const sourceId = crypto.randomUUID();
    const entry = await createPostedEntry({ sourceType: 'MANUAL', sourceId, entryDate: data.entryDate, description: data.description, createdBy: userId, lines: data.lines.map((line) => ({ accountId: line.accountId, partnerId: line.partnerId, debit: line.debit || '0', credit: line.credit || '0', description: line.description })), transaction });
    return plain(entry);
  });
}
async function reverseEntry(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const original = await JournalEntry.findByPk(id, { include: includeLines(), transaction, lock: transaction.LOCK.UPDATE });
    if (!original) throw ErrorApi.notFound('سند حسابداری پیدا نشد');
    if (original.source_type === 'REVERSAL') throw ErrorApi.conflict('سند معکوس خودش قابل برگشت مجدد نیست');
    if (original.source_type !== 'MANUAL') throw ErrorApi.conflict('سندهای عملیاتی باید از مسیر همان ماژول برگشت داده شوند');
    const existing = await JournalEntry.findOne({ where: { source_type: 'REVERSAL', source_id: original.id }, transaction });
    if (existing) throw ErrorApi.conflict('این سند قبلاً برگشت داده شده است');
    for (const line of original.lines.filter((item) => item.treasury_account_id)) {
      const treasury = await TreasuryAccount.findByPk(line.treasury_account_id, { transaction, lock: transaction.LOCK.UPDATE });
      const current = await JournalLine.findAll({ where: { treasury_account_id: treasury.id }, include: [{ model: JournalEntry, as: 'entry', where: { status: 'POSTED' }, required: true, attributes: [] }], attributes: ['debit', 'credit'], transaction });
      const currentBalance = current.reduce((sum, item) => sum + BigInt(item.debit) - BigInt(item.credit), 0n);
      const reversalDelta = BigInt(line.credit) - BigInt(line.debit);
      if (currentBalance + reversalDelta < 0n) throw ErrorApi.conflict('برگشت سند باعث منفی‌شدن موجودی حساب خزانه می‌شود', { treasuryAccountId: treasury.id, available: currentBalance.toString() });
    }
    const reversal = await createPostedEntry({ sourceType: 'REVERSAL', sourceId: original.id, entryDate: data.entryDate, description: data.description, createdBy: userId, lines: original.lines.map((line) => ({ accountId: line.account_id, treasuryAccountId: line.treasury_account_id, partnerId: line.partner_id, debit: line.credit, credit: line.debit, description: line.description })), transaction });
    return plain(reversal);
  });
}async function trialBalance({ asOf }) {
  const rows = await sequelize.query(
    `SELECT a.id, a.code, a.name, a.account_type, COALESCE(SUM(CASE WHEN e.id IS NOT NULL THEN l.debit ELSE 0 END),0) AS debit_total, COALESCE(SUM(CASE WHEN e.id IS NOT NULL THEN l.credit ELSE 0 END),0) AS credit_total FROM financial_accounts a LEFT JOIN journal_lines l ON l.account_id=a.id LEFT JOIN journal_entries e ON e.id=l.journal_entry_id AND e.status='POSTED' AND (:asOf IS NULL OR e.entry_date <= :asOf) GROUP BY a.id,a.code,a.name,a.account_type ORDER BY a.code`,
    { replacements: { asOf: dateOnly(asOf) || today() }, type: require('sequelize').QueryTypes.SELECT },
  );
  const accounts = rows.map((row) => { const debit = BigInt(row.debit_total); const credit = BigInt(row.credit_total); const net = debit - credit; return { ...row, debit_total: debit.toString(), credit_total: credit.toString(), debit_balance: net > 0n ? net.toString() : '0', credit_balance: net < 0n ? (-net).toString() : '0' }; });
  const totalDebit = accounts.reduce((sum, row) => sum + BigInt(row.debit_total), 0n);
  const totalCredit = accounts.reduce((sum, row) => sum + BigInt(row.credit_total), 0n);
  return { asOf: dateOnly(asOf) || today(), accounts, totalDebit: totalDebit.toString(), totalCredit: totalCredit.toString(), balanced: totalDebit === totalCredit };
}async function financialTotals({ from, to, asOf, accountTypes, transaction }) {
  const conditions = ["e.status = 'POSTED'"];
  const replacements = {};
  if (asOf) { conditions.push('e.entry_date <= :asOf'); replacements.asOf = dateOnly(asOf); }
  else {
    if (from) { conditions.push('e.entry_date >= :from'); replacements.from = dateOnly(from); }
    if (to) { conditions.push('e.entry_date <= :to'); replacements.to = dateOnly(to); }
  }
  const whereTypes = accountTypes?.length ? `AND a.account_type IN (${accountTypes.map((_, i) => `:type${i}`).join(',')})` : '';
  (accountTypes || []).forEach((type, i) => { replacements[`type${i}`] = type; });
  const rows = await sequelize.query(
    `SELECT a.id,a.code,a.name,a.account_type,COALESCE(SUM(l.debit),0) AS debit_total,COALESCE(SUM(l.credit),0) AS credit_total FROM financial_accounts a LEFT JOIN journal_lines l ON l.account_id=a.id LEFT JOIN journal_entries e ON e.id=l.journal_entry_id AND ${conditions.join(' AND ')} ${whereTypes} GROUP BY a.id,a.code,a.name,a.account_type ORDER BY a.code`,
    { replacements, type: require('sequelize').QueryTypes.SELECT, transaction },
  );
  return rows.map((row) => ({ ...row, debit_total: BigInt(row.debit_total), credit_total: BigInt(row.credit_total) }));
}
async function incomeStatement({ from, to }) {
  const rows = await financialTotals({ from, to, accountTypes: ['REVENUE', 'EXPENSE'] });
  const revenue = rows.filter((row) => row.account_type === 'REVENUE').map((row) => ({ id: row.id, code: row.code, name: row.name, credit: row.credit_total.toString(), debit: row.debit_total.toString(), balance: (row.credit_total - row.debit_total).toString() }));
  const expense = rows.filter((row) => row.account_type === 'EXPENSE').map((row) => ({ id: row.id, code: row.code, name: row.name, debit: row.debit_total.toString(), credit: row.credit_total.toString(), balance: (row.debit_total - row.credit_total).toString() }));
  const totalRevenue = revenue.reduce((sum, row) => sum + BigInt(row.balance), 0n);
  const totalExpense = expense.reduce((sum, row) => sum + BigInt(row.balance), 0n);
  return { currency: 'IRR', from: dateOnly(from), to: dateOnly(to), revenue, expenses: expense, totalRevenue: totalRevenue.toString(), totalExpenses: totalExpense.toString(), netIncome: (totalRevenue - totalExpense).toString() };
}
async function balanceSheet({ asOf }) {
  const rows = await financialTotals({ asOf, accountTypes: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] });
  const accounts = rows.filter((row) => ['ASSET', 'LIABILITY', 'EQUITY'].includes(row.account_type)).map((row) => {
    const net = row.debit_total - row.credit_total;
    const balance = row.account_type === 'ASSET' ? net : -net;
    return { id: row.id, code: row.code, name: row.name, accountType: row.account_type, balance: balance.toString() };
  });
  const totalAssets = accounts.filter((row) => row.accountType === 'ASSET').reduce((sum, row) => sum + BigInt(row.balance), 0n);
  const totalLiabilities = accounts.filter((row) => row.accountType === 'LIABILITY').reduce((sum, row) => sum + BigInt(row.balance), 0n);
  const totalEquity = accounts.filter((row) => row.accountType === 'EQUITY').reduce((sum, row) => sum + BigInt(row.balance), 0n);
  const revenue = rows.filter((row) => row.account_type === 'REVENUE').reduce((sum, row) => sum + row.credit_total - row.debit_total, 0n);
  const expenses = rows.filter((row) => row.account_type === 'EXPENSE').reduce((sum, row) => sum + row.debit_total - row.credit_total, 0n);
  const currentEarnings = revenue - expenses;
  return { currency: 'IRR', asOf: dateOnly(asOf) || today(), accounts, totalAssets: totalAssets.toString(), totalLiabilities: totalLiabilities.toString(), totalEquity: totalEquity.toString(), currentEarnings: currentEarnings.toString(), liabilitiesAndEquity: (totalLiabilities + totalEquity + currentEarnings).toString(), balanced: totalAssets === totalLiabilities + totalEquity + currentEarnings };
}async function accountLedger(id, { page, limit, from, to }) {
  const account = await FinancialAccount.findByPk(id);
  if (!account) throw ErrorApi.notFound('حساب پیدا نشد');
  const entryWhere = { status: 'POSTED' };
  const fromDate = dateOnly(from); const toDate = dateOnly(to);
  if (toDate) entryWhere.entry_date = { [Op.lte]: toDate };
  const result = await JournalLine.findAndCountAll({ where: { account_id: id }, include: [{ model: JournalEntry, as: 'entry', where: entryWhere, required: true, attributes: ['id', 'entry_no', 'entry_date', 'description', 'source_type'] }, { model: require('../../../core/database/models').CommercialPartner, as: 'partner', attributes: ['id', 'code', 'name'] }, { model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'account_type'] }], distinct: true, order: [[{ model: JournalEntry, as: 'entry' }, 'entry_date', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']] });
  let running = 0n; let openingBalance = 0n; const all = [];
  for (const line of result.rows) {
    running += BigInt(line.debit) - BigInt(line.credit);
    if (fromDate && line.entry.entry_date < fromDate) { openingBalance = running; continue; }
    all.push({ ...plain(line), running_balance: running.toString() });
  }
  const offset = (page - 1) * limit;
  return { account: plain(account), opening_balance: openingBalance.toString(), items: all.slice(offset, offset + limit), pagination: { page, limit, totalItems: all.length, totalPages: Math.ceil(all.length / limit) } };
}module.exports = { getSystemAccount, createPostedEntry, listAccounts, createAccount, updateAccount, deleteAccount, getJournal, listJournalEntries, createManualEntry, reverseEntry, trialBalance, incomeStatement, balanceSheet, accountLedger, previewFiscalClose, closeFiscalYear, listFiscalYears, amount };









