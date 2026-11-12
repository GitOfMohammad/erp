const crypto = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../../core/database/db');
const ErrorApi = require('../../../core/api/ErrorApi');
const { TreasuryAccount, TreasuryTransfer, FinancialAccount, JournalEntry, JournalLine } = require('../../../core/database/models');
const ledger = require('../gl/ledger.service');
const plain = (value) => value?.get ? value.get({ plain: true }) : value;
const today = () => new Date().toISOString().slice(0, 10);
const dateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;
const includes = [{ model: FinancialAccount, as: 'financialAccount', attributes: ['id', 'code', 'name'] }];
const asciiDigits = (value) => String(value || '').replace(/[۰-۹٠-٩]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(digit) % 10));
async function balance(accountId, transaction) {
  const account = await TreasuryAccount.findByPk(accountId, { transaction, lock: transaction?.LOCK.UPDATE });
  if (!account) throw ErrorApi.notFound('حساب خزانه پیدا نشد');
  const rows = await JournalLine.findAll({ where: { treasury_account_id: account.id }, include: [{ model: JournalEntry, as: 'entry', where: { status: 'POSTED' }, required: true, attributes: [] }], attributes: ['debit', 'credit'], transaction });
  return rows.reduce((sum, line) => sum + BigInt(line.debit) - BigInt(line.credit), 0n);
}
async function listAccounts({ page, limit, search, accountType, is_active }) {
  const where = {};
  if (accountType) where.account_type = accountType;
  if (is_active !== undefined) where.is_active = is_active;
  if (search) where[Op.or] = [{ code: { [Op.like]: `%${search}%` } }, { name: { [Op.like]: `%${search}%` } }, { bank_name: { [Op.like]: `%${search}%` } }];
  const result = await TreasuryAccount.findAndCountAll({ where, include: includes, limit, offset: (page - 1) * limit, order: [['name', 'ASC']] });
  const items = await Promise.all(result.rows.map(async (row) => ({ ...plain(row), balance: (await balance(row.id)).toString() })));
  return { items, pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function getAccount(id) {
  const account = await TreasuryAccount.findByPk(id, { include: includes });
  if (!account) throw ErrorApi.notFound('حساب خزانه پیدا نشد');
  return { ...plain(account), balance: (await balance(id)).toString() };
}
async function createAccount(data, userId) {
  return sequelize.transaction(async (transaction) => {
    const id = crypto.randomUUID();
    const parentCode = data.accountType === 'BANK' ? '1010' : '1000';
    const parent = await FinancialAccount.findByPk(await findCode(parentCode, transaction), { transaction, lock: transaction.LOCK.UPDATE });
    const prefix = ({ CASH: 'CASH', BANK: 'BANK', PETTY_CASH: 'PETTY' })[data.accountType];
    let sequence = 1;
    let generatedCode;
    do {
      if (sequence > 999) throw ErrorApi.conflict('ظرفیت شماره‌گذاری این نوع حساب خزانه تکمیل شده است');
      generatedCode = `${prefix}-${String(sequence).padStart(3, '0')}`;
      sequence += 1;
    } while (await TreasuryAccount.findOne({ where: { code: generatedCode }, transaction }));
    const accountCode = `T-${generatedCode}`;
    const financial = await FinancialAccount.create({ code: accountCode, name: data.name, account_type: 'ASSET', parent_id: parent.id, is_system: 1, is_postable: 1, is_active: 1 }, { transaction });
    const account = await TreasuryAccount.create({ id, code: generatedCode, name: data.name, description: data.description || null, account_type: data.accountType, financial_account_id: financial.id, bank_name: data.bankName || null, branch_name: data.branchName || null, branch_code: data.branchCode || null, bank_address: data.bankAddress || null, bank_phone: data.bankPhone || null, account_number: data.accountNumber || null, card_number: data.cardNumber ? asciiDigits(data.cardNumber) : null, iban: data.iban || null, custodian_name: data.custodianName || null, limit_amount: data.limitAmount || null, is_active: 1 }, { transaction });
    const opening = ledger.amount(data.openingBalance || '0', 'مانده افتتاحیه');
    if (opening > 0n) {
      await ledger.createPostedEntry({ sourceType: 'OPENING_BALANCE', sourceId: id, entryDate: data.openingDate || today(), description: `مانده افتتاحیه ${data.name}`, createdBy: userId, lines: [
        { accountId: financial.id, treasuryAccountId: id, debit: opening.toString(), credit: '0' },
        { accountCode: '3000', debit: '0', credit: opening.toString() },
      ], transaction });
    }
    return { ...plain(account), financialAccount: plain(financial), balance: opening.toString() };
  });
}
async function updateAccount(id, data) {
  return sequelize.transaction(async (transaction) => {
    const account = await TreasuryAccount.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!account) throw ErrorApi.notFound('حساب خزانه پیدا نشد');
    if (data.accountType && data.accountType !== account.account_type) throw ErrorApi.conflict('نوع حساب خزانه پس از ایجاد قابل تغییر نیست');
    if (account.account_type === 'PETTY_CASH' && data.limitAmount !== undefined && !data.limitAmount) throw ErrorApi.badRequest('سقف تنخواه باید بزرگ‌تر از صفر باشد');
    if (account.account_type === 'PETTY_CASH' && data.custodianName !== undefined && !data.custodianName?.trim()) throw ErrorApi.badRequest('مسئول تنخواه را وارد کنید');
    if (data.isActive === 0) {
      const current = await balance(account.id, transaction);
      if (current !== 0n) throw ErrorApi.conflict('برای غیرفعال‌کردن حساب، ابتدا مانده آن باید صفر شود', { balance: current.toString() });
    }
    await account.update({ ...(data.name !== undefined ? { name: data.name } : {}), ...(data.description !== undefined ? { description: data.description || null } : {}), ...(data.bankName !== undefined ? { bank_name: data.bankName || null } : {}), ...(data.branchName !== undefined ? { branch_name: data.branchName || null } : {}), ...(data.branchCode !== undefined ? { branch_code: data.branchCode || null } : {}), ...(data.bankAddress !== undefined ? { bank_address: data.bankAddress || null } : {}), ...(data.bankPhone !== undefined ? { bank_phone: data.bankPhone || null } : {}), ...(data.accountNumber !== undefined ? { account_number: data.accountNumber || null } : {}), ...(data.cardNumber !== undefined ? { card_number: data.cardNumber ? asciiDigits(data.cardNumber) : null } : {}), ...(data.iban !== undefined ? { iban: data.iban || null } : {}), ...(data.custodianName !== undefined ? { custodian_name: data.custodianName || null } : {}), ...(data.limitAmount !== undefined ? { limit_amount: data.limitAmount || null } : {}), ...(data.isActive !== undefined ? { is_active: data.isActive } : {}) }, { transaction });
    const financial = await FinancialAccount.findByPk(account.financial_account_id, { transaction, lock: transaction.LOCK.UPDATE });
    await financial.update({ ...(data.name !== undefined ? { name: data.name } : {}), ...(data.isActive !== undefined ? { is_active: data.isActive } : {}) }, { transaction });
    return { ...plain(account), financialAccount: plain(financial), balance: (await balance(account.id, transaction)).toString() };
  });
}async function createTransfer(data, userId) {
  return sequelize.transaction(async (transaction) => {
    if (data.sourceAccountId === data.destinationAccountId) throw ErrorApi.badRequest('حساب مبدا و مقصد باید متفاوت باشند');
    const source = await TreasuryAccount.findByPk(data.sourceAccountId, { transaction, lock: transaction.LOCK.UPDATE });
    const destination = await TreasuryAccount.findByPk(data.destinationAccountId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!source || Number(source.is_active) !== 1) throw ErrorApi.notFound('حساب مبدا فعال پیدا نشد');
    if (!destination || Number(destination.is_active) !== 1) throw ErrorApi.notFound('حساب مقصد فعال پیدا نشد');
    const amount = ledger.amount(data.amount);
    if (amount <= 0n) throw ErrorApi.badRequest('مبلغ انتقال باید بزرگ‌تر از صفر باشد');
    const available = await balance(source.id, transaction);
    if (available < amount) throw ErrorApi.conflict('موجودی حساب مبدا کافی نیست', { available: available.toString(), requested: amount.toString() });
    const id = crypto.randomUUID();
    const journal = await ledger.createPostedEntry({ sourceType: 'ACCOUNT_TRANSFER', sourceId: id, entryDate: data.transferDate || today(), description: data.note || `انتقال از ${source.name} به ${destination.name}`, createdBy: userId, lines: [
      { accountId: destination.financial_account_id, treasuryAccountId: destination.id, debit: amount.toString(), credit: '0' },
      { accountId: source.financial_account_id, treasuryAccountId: source.id, debit: '0', credit: amount.toString() },
    ], transaction });
    const transfer = await TreasuryTransfer.create({ id, transfer_no: `TR-${today().replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`, source_account_id: source.id, destination_account_id: destination.id, amount: amount.toString(), transfer_date: data.transferDate || today(), reference: data.reference || null, note: data.note || null, journal_entry_id: journal.id, created_by: userId }, { transaction });
    return plain(transfer);
  });
}
async function findCode(code, transaction) { const account = await FinancialAccount.findOne({ where: { code }, transaction }); if (!account) throw ErrorApi.internalServerError(`سرفصل ${code} تعریف نشده است`); return account.id; }
async function reverseTransfer(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const original = await TreasuryTransfer.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!original) throw ErrorApi.notFound('انتقال وجه پیدا نشد');
    if (original.reverses_transfer_id) throw ErrorApi.conflict('انتقال معکوس خودش قابل برگشت مجدد نیست');
    if (await TreasuryTransfer.findOne({ where: { reverses_transfer_id: original.id }, transaction })) throw ErrorApi.conflict('این انتقال قبلاً برگشت داده شده است');
    const lockIds = [original.source_account_id, original.destination_account_id].sort();
    const locked = {};
    for (const accountId of lockIds) locked[accountId] = await TreasuryAccount.findByPk(accountId, { transaction, lock: transaction.LOCK.UPDATE });
    const source = locked[original.destination_account_id];
    const destination = locked[original.source_account_id];
    if (!source || !destination || Number(source.is_active) !== 1 || Number(destination.is_active) !== 1) throw ErrorApi.conflict('حساب‌های این انتقال باید فعال باشند');
    const amount = BigInt(original.amount);
    const available = await balance(source.id, transaction);
    if (available < amount) throw ErrorApi.conflict('موجودی حساب مقصد اولیه برای برگشت انتقال کافی نیست', { available: available.toString(), requested: amount.toString() });
    const reverseId = crypto.randomUUID();
    const journal = await ledger.createPostedEntry({ sourceType: 'ACCOUNT_TRANSFER', sourceId: reverseId, entryDate: data.transferDate || today(), description: data.reason, createdBy: userId, lines: [
      { accountId: destination.financial_account_id, treasuryAccountId: destination.id, debit: amount.toString(), credit: '0' },
      { accountId: source.financial_account_id, treasuryAccountId: source.id, debit: '0', credit: amount.toString() },
    ], transaction });
    const transfer = await TreasuryTransfer.create({ id: reverseId, transfer_no: `TR-${today().replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`, source_account_id: source.id, destination_account_id: destination.id, amount: amount.toString(), transfer_date: data.transferDate || today(), reference: data.reference || null, note: data.reason, journal_entry_id: journal.id, reverses_transfer_id: original.id, created_by: userId }, { transaction });
    return plain(transfer);
  });
}async function listTransfers({ page, limit, from, to, accountId }) {
  const where = {};
  if (accountId) where[Op.or] = [{ source_account_id: accountId }, { destination_account_id: accountId }];
  if (from || to) where.transfer_date = { ...(from ? { [Op.gte]: dateOnly(from) } : {}), ...(to ? { [Op.lte]: dateOnly(to) } : {}) };
  const result = await TreasuryTransfer.findAndCountAll({ where, include: [{ model: TreasuryAccount, as: 'sourceAccount', attributes: ['id', 'code', 'name'] }, { model: TreasuryAccount, as: 'destinationAccount', attributes: ['id', 'code', 'name'] }, { model: JournalEntry, as: 'journalEntry', attributes: ['id', 'entry_no'] }], limit, offset: (page - 1) * limit, order: [['transfer_date', 'DESC'], ['created_at', 'DESC']] });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function accountTransactions(accountId, { page, limit, from, to }) {
  const account = await TreasuryAccount.findByPk(accountId, { include: includes });
  if (!account) throw ErrorApi.notFound('حساب خزانه پیدا نشد');
  const where = { treasury_account_id: accountId };
  const entryWhere = { status: 'POSTED' };
  const fromDate = dateOnly(from); const toDate = dateOnly(to);
  if (toDate) entryWhere.entry_date = { [Op.lte]: toDate };
  const result = await JournalLine.findAndCountAll({ where, include: [{ model: JournalEntry, as: 'entry', where: entryWhere, required: true, attributes: ['id', 'entry_no', 'entry_date', 'description', 'source_type'] }], distinct: true, order: [[{ model: JournalEntry, as: 'entry' }, 'entry_date', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']] });
  let running = 0n; let openingBalance = 0n; const all = [];
  for (const row of result.rows) {
    running += BigInt(row.debit) - BigInt(row.credit);
    if (fromDate && row.entry.entry_date < fromDate) { openingBalance = running; continue; }
    all.push({ ...plain(row), running_balance: running.toString() });
  }
  const offset = (page - 1) * limit;
  return { account: plain(account), opening_balance: openingBalance.toString(), items: all.slice(offset, offset + limit), pagination: { page, limit, totalItems: all.length, totalPages: Math.ceil(all.length / limit) } };
}async function accountBalances() {
  const accounts = await TreasuryAccount.findAll({ where: { is_active: 1 }, include: includes, order: [['name', 'ASC']] });
  return Promise.all(accounts.map(async (account) => ({ ...plain(account), balance: (await balance(account.id)).toString() })));
}
module.exports = { listAccounts, getAccount, createAccount, updateAccount, createTransfer, reverseTransfer, listTransfers, accountTransactions, accountBalances, balance };







