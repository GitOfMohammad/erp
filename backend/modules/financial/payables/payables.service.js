'use strict';
const { Op } = require('sequelize');
const crypto = require('node:crypto');
const { sequelize } = require('../../../core/database/db');
const models = require('../../../core/database/models');
const ErrorApi = require('../../../core/api/ErrorApi');
const ledger = require('../gl/ledger.service');
const treasury = require('../banking/treasury.service');
const plain = (x) => x?.get ? x.get({ plain: true }) : x;
const dateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
const SOURCE_CONFIG = {
  FIXED_ASSET_ACQUISITION: {
    model: models.FixedAsset, entryType: 'FIXED_ASSET_ACQUISITION', amountField: 'purchase_cost', entryField: 'purchase_journal_entry_id',
    description: (x) => `خرید دارایی ${x.asset_code} - ${x.name}`, reference: (x) => x.asset_code, date: (x) => x.purchase_date,
  },
  PROJECT_EXPENSE: {
    model: models.ProjectExpense, entryType: 'PROJECT_EXPENSE', amountField: 'amount', entryField: 'journal_entry_id',
    include: [{ model: models.Project, as: 'project', attributes: ['id', 'code', 'name'] }],
    where: { status: 'APPROVED' }, description: (x) => `هزینه پروژه ${x.project?.code || ''} - ${x.description}`, reference: (x) => x.project?.code || x.id, date: (x) => x.expense_date,
  },
  PRODUCTION_ORDER_COST: {
    model: models.ProductionOrderCost, entryType: 'PRODUCTION_ORDER_COST', amountField: 'amount', entryField: 'journal_entry_id',
    include: [{ model: models.ProductionOrder, as: 'order', attributes: ['id', 'order_number'] }],
    description: (x) => `${x.cost_type === 'LABOR' ? 'دستمزد' : 'سربار'} تولید ${x.order?.order_number || ''} - ${x.description}`, reference: (x) => x.order?.order_number || x.id, date: (x) => x.cost_date,
  },
};
function getConfig(sourceType) {
  const config = SOURCE_CONFIG[sourceType];
  if (!config) throw ErrorApi.badRequest('نوع پرداختنی پشتیبانی نمی‌شود');
  return config;
}
async function loadSource(sourceType, sourceId, transaction, lock = false) {
  const config = getConfig(sourceType);
  const row = await config.model.findByPk(sourceId, { include: config.include, transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!row || (config.where && Object.entries(config.where).some(([key, value]) => row[key] !== value))) throw ErrorApi.notFound('سند پرداختنی پیدا نشد یا هنوز تأیید نشده است');
  const entryId = row[config.entryField];
  if (!entryId) throw ErrorApi.conflict('سند این پرداختنی هنوز در دفتر کل ثبت نشده است');
  const entry = await models.JournalEntry.findByPk(entryId, { transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!entry || entry.source_type !== config.entryType || entry.source_id !== row.id || entry.status !== 'POSTED') throw ErrorApi.conflict('سند مبنای پرداختنی در دفتر کل قطعی نیست');
  return { config, row, entry };
}
async function payableBaseAmount(entry, transaction) {
  const account = await models.FinancialAccount.findOne({ where: { code: '2000' }, transaction });
  if (!account) throw ErrorApi.internalServerError('حساب پرداختنی 2000 پیدا نشد');
  const lines = await models.JournalLine.findAll({ where: { journal_entry_id: entry.id, account_id: account.id }, attributes: ['debit', 'credit'], transaction });
  return lines.reduce((sum, line) => sum + BigInt(line.credit) - BigInt(line.debit), 0n);
}
async function summarize(sourceType, sourceId, transaction, lock = false, includeSettlements = false) {
  const { config, row, entry } = await loadSource(sourceType, sourceId, transaction, lock);
  const amount = await payableBaseAmount(entry, transaction);
  if (amount <= 0n) throw ErrorApi.conflict('سند منبع بدهی قابل‌تسویه‌ای در حساب پرداختنی ایجاد نکرده است');
  const settlementRows = await models.PayableSettlement.findAll({ where: { source_type: sourceType, source_id: sourceId }, order: [['paid_at', 'ASC'], ['created_at', 'ASC']], transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  let settled = 0n;
  for (const item of settlementRows) settled += item.reverses_settlement_id ? -BigInt(item.amount) : BigInt(item.amount);
  const due = amount - settled;
  if (settled < 0n || due < 0n) throw ErrorApi.conflict('مانده پرداختنی با سوابق تسویه سازگار نیست');
  const result = {
    sourceType, sourceId: row.id, sourceEntryId: entry.id, reference: config.reference(row), description: config.description(row),
    sourceDate: dateOnly(config.date(row)), amount: amount.toString(), settledAmount: settled.toString(), balanceDue: due.toString(),
  };
  if (includeSettlements) result.settlements = settlementRows.map(plain);
  return result;
}
async function listPayables({ page, limit, sourceType, openOnly = true }) {
  const types = sourceType ? [sourceType] : Object.keys(SOURCE_CONFIG);
  const all = [];
  for (const type of types) {
    const config = getConfig(type);
    const where = { [config.entryField]: { [Op.ne]: null }, ...(config.where || {}) };
    const rows = await config.model.findAll({ where, include: config.include, order: [['created_at', 'DESC']] });
    for (const row of rows) {
      try {
        const item = await summarize(type, row.id);
        if (!openOnly || BigInt(item.balanceDue) > 0n) all.push(item);
      } catch (error) {
        if (error.statusCode === 404) continue;
        throw error;
      }
    }
  }
  all.sort((a, b) => b.sourceDate.localeCompare(a.sourceDate));
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);
  return { items, pagination: { page, limit, totalItems: all.length, totalPages: Math.ceil(all.length / limit) } };
}
async function getPayable(sourceType, sourceId) { return summarize(sourceType, sourceId, undefined, false, true); }
function validateMethod(method, account) {
  if (method === 'CASH' && !['CASH', 'PETTY_CASH'].includes(account.account_type)) throw ErrorApi.badRequest('پرداخت نقدی باید به حساب صندوق یا تنخواه وصل شود');
  if (['BANK_TRANSFER', 'CHEQUE'].includes(method) && account.account_type !== 'BANK') throw ErrorApi.badRequest('انتقال بانکی یا چک باید به حساب بانکی وصل شود');
}
async function createSettlement(sourceType, sourceId, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const due = await summarize(sourceType, sourceId, transaction, true);
    const amount = ledger.amount(data.amount, 'مبلغ پرداخت');
    if (amount <= 0n) throw ErrorApi.badRequest('مبلغ پرداخت باید بزرگ‌تر از صفر باشد');
    if (amount > BigInt(due.balanceDue)) throw ErrorApi.conflict('مبلغ پرداخت از مانده پرداختنی بیشتر است', { balanceDue: due.balanceDue, requested: amount.toString() });
    const account = await models.TreasuryAccount.findByPk(data.treasuryAccountId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!account || Number(account.is_active) !== 1) throw ErrorApi.notFound('حساب خزانه فعال پیدا نشد');
    validateMethod(data.method, account);
    const available = await treasury.balance(account.id, transaction);
    if (available < amount) throw ErrorApi.conflict('موجودی حساب خزانه برای این پرداخت کافی نیست', { available: available.toString(), requested: amount.toString() });
    const id = crypto.randomUUID();
    const paidAt = dateOnly(data.paidAt);
    const settlement = await models.PayableSettlement.create({ id, source_type: sourceType, source_id: sourceId, treasury_account_id: account.id, amount: amount.toString(), method: data.method, reference: data.reference || null, paid_at: paidAt, note: data.note || null, created_by: userId }, { transaction });
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'PAYABLE_SETTLEMENT', sourceId: id, entryDate: paidAt, description: `تسویه ${due.reference} - ${due.description}`, createdBy: userId, lines: [
      { accountCode: '2000', debit: amount.toString(), credit: '0' },
      { accountId: account.financial_account_id, treasuryAccountId: account.id, debit: '0', credit: amount.toString() },
    ], transaction });
    await settlement.update({ journal_entry_id: journalEntry.id }, { transaction });
    return { settlement: plain(settlement), journalEntry, payable: await summarize(sourceType, sourceId, transaction) };
  });
}
async function reverseSettlement(settlementId, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const snapshot = await models.PayableSettlement.findByPk(settlementId, { transaction });
    if (!snapshot || snapshot.reverses_settlement_id) throw ErrorApi.notFound('پرداختنیِ تسویه‌شده پیدا نشد');
    const due = await summarize(snapshot.source_type, snapshot.source_id, transaction, true);
    const original = await models.PayableSettlement.findByPk(settlementId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!original || original.reverses_settlement_id) throw ErrorApi.notFound('پرداختنیِ تسویه‌شده پیدا نشد');
    if (await models.PayableSettlement.findOne({ where: { reverses_settlement_id: original.id }, transaction })) throw ErrorApi.conflict('این تسویه قبلاً برگشت داده شده است');
    const account = await models.TreasuryAccount.findByPk(original.treasury_account_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!account) throw ErrorApi.conflict('حساب خزانهٔ تسویه پیدا نشد');
    const id = crypto.randomUUID();
    const reversalDate = dateOnly(data.paidAt);
    const reversal = await models.PayableSettlement.create({ id, source_type: original.source_type, source_id: original.source_id, treasury_account_id: account.id, amount: original.amount, method: original.method, reference: data.reference || `REV-${original.id.slice(0, 8)}`, paid_at: reversalDate, note: data.reason, reverses_settlement_id: original.id, created_by: userId }, { transaction });
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'PAYABLE_SETTLEMENT', sourceId: id, entryDate: reversalDate, description: `برگشت تسویه ${due.reference} - ${data.reason}`, createdBy: userId, lines: [
      { accountId: account.financial_account_id, treasuryAccountId: account.id, debit: String(original.amount), credit: '0' },
      { accountCode: '2000', debit: '0', credit: String(original.amount) },
    ], transaction });
    await reversal.update({ journal_entry_id: journalEntry.id }, { transaction });
    return { settlement: plain(reversal), journalEntry, payable: await summarize(original.source_type, original.source_id, transaction) };
  });
}
module.exports = { listPayables, getPayable, createSettlement, reverseSettlement };
