const crypto = require('node:crypto');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/db');
const ErrorApi = require('../../../core/api/ErrorApi');
const { TreasuryAccount, BankReconciliation, BankReconciliationLine, JournalLine, JournalEntry } = require('../../../core/database/models');
const plain = (row) => row?.get ? row.get({ plain: true }) : row;
const signedAmount = (value) => {
  if (!/^-?(0|[1-9][0-9]{0,17})$/.test(String(value)) || String(value) === '-0') throw ErrorApi.badRequest('مبلغ باید عدد صحیح ریالی باشد');
  return BigInt(value);
};
async function accountOrFail(id, transaction) {
  const account = await TreasuryAccount.findByPk(id, { transaction, lock: transaction?.LOCK.UPDATE });
  if (!account || account.account_type !== 'BANK' || Number(account.is_active) !== 1) throw ErrorApi.badRequest('مغایرت‌گیری فقط برای حساب بانکی فعال انجام می‌شود');
  return account;
}
async function list({ page = 1, limit = 20 }) {
  const result = await BankReconciliation.findAndCountAll({ include: [{ model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'bank_name'] }], order: [['end_date', 'DESC']], limit, offset: (page - 1) * limit });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function create(data) {
  return sequelize.transaction(async (transaction) => {
    await accountOrFail(data.treasuryAccountId, transaction);
    if (data.startDate > data.endDate) throw ErrorApi.badRequest('تاریخ شروع باید پیش از تاریخ پایان باشد');
    const clash = await BankReconciliation.findOne({ where: { treasury_account_id: data.treasuryAccountId, start_date: { [Op.lte]: data.endDate }, end_date: { [Op.gte]: data.startDate } }, transaction, lock: transaction.LOCK.UPDATE });
    if (clash) throw ErrorApi.conflict('برای این حساب در این بازه، مغایرت‌گیری دیگری ثبت شده است');
    return plain(await BankReconciliation.create({ id: crypto.randomUUID(), treasury_account_id: data.treasuryAccountId, start_date: data.startDate, end_date: data.endDate, statement_opening_balance: data.statementOpeningBalance, statement_closing_balance: data.statementClosingBalance, status: 'DRAFT' }, { transaction }));
  });
}
async function bookLines(reconciliation, transaction, entryDate) {
  const dateWhere = entryDate ? { [Op.eq]: entryDate } : { [Op.between]: [reconciliation.start_date, reconciliation.end_date] };
  return JournalLine.findAll({ where: { treasury_account_id: reconciliation.treasury_account_id }, include: [{ model: JournalEntry, as: 'entry', where: { status: 'POSTED', entry_date: dateWhere }, required: true, attributes: ['id', 'entry_no', 'entry_date', 'description'] }], attributes: ['id', 'debit', 'credit', 'description'], order: [[{ model: JournalEntry, as: 'entry' }, 'entry_date', 'ASC']], transaction });
}
async function summary(reconciliation, transaction) {
  const [[bookTotals], [statementTotals]] = await Promise.all([
    sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN je.entry_date < :startDate THEN jl.debit - jl.credit ELSE 0 END), 0) AS bookOpening,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN :startDate AND :endDate THEN jl.debit - jl.credit ELSE 0 END), 0) AS bookMovement,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN :startDate AND :endDate AND brl.matched_journal_line_id IS NULL THEN jl.debit - jl.credit ELSE 0 END), 0) AS unmatchedBookNet,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN :startDate AND :endDate AND brl.matched_journal_line_id IS NULL THEN 1 ELSE 0 END), 0) AS unmatchedBookCount
      FROM journal_lines jl
      INNER JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
      LEFT JOIN bank_reconciliation_lines brl ON brl.matched_journal_line_id = jl.id AND brl.reconciliation_id = :reconciliationId
      WHERE jl.treasury_account_id = :treasuryAccountId AND je.entry_date <= :endDate
    `, { replacements: { reconciliationId: reconciliation.id, treasuryAccountId: reconciliation.treasury_account_id, startDate: reconciliation.start_date, endDate: reconciliation.end_date }, type: QueryTypes.SELECT, transaction }),
    sequelize.query(`
      SELECT
        COALESCE(SUM(amount), 0) AS statementNet,
        COUNT(*) AS statementLineCount,
        COALESCE(SUM(CASE WHEN matched_journal_line_id IS NULL THEN 1 ELSE 0 END), 0) AS unmatchedStatementLines
      FROM bank_reconciliation_lines WHERE reconciliation_id = :reconciliationId
    `, { replacements: { reconciliationId: reconciliation.id }, type: QueryTypes.SELECT, transaction }),
  ]);
  const bookOpening = BigInt(bookTotals.bookOpening || 0);
  const bookMovement = BigInt(bookTotals.bookMovement || 0);
  const unmatchedBookNet = BigInt(bookTotals.unmatchedBookNet || 0);
  const statementNet = BigInt(statementTotals.statementNet || 0);
  const statementOpening = BigInt(reconciliation.statement_opening_balance);
  const bookClosing = bookOpening + bookMovement;
  const statementCalculatedClosing = statementOpening + statementNet;
  const adjustedStatement = BigInt(reconciliation.statement_closing_balance) + unmatchedBookNet;
  const unmatchedStatementLines = Number(statementTotals.unmatchedStatementLines || 0);
  const statementLineCount = Number(statementTotals.statementLineCount || 0);
  return { statementOpening: statementOpening.toString(), statementClosing: String(reconciliation.statement_closing_balance), statementCalculatedClosing: statementCalculatedClosing.toString(), statementInputDifference: (BigInt(reconciliation.statement_closing_balance) - statementCalculatedClosing).toString(), bookOpening: bookOpening.toString(), bookClosing: bookClosing.toString(), unmatchedBookCount: Number(bookTotals.unmatchedBookCount || 0), unmatchedBookNet: unmatchedBookNet.toString(), adjustedStatement: adjustedStatement.toString(), difference: (adjustedStatement - bookClosing).toString(), unmatchedStatementLines, statementLineCount, matchedCount: statementLineCount - unmatchedStatementLines };
}
async function get(id) {
  const reconciliation = await BankReconciliation.findByPk(id, { include: [{ model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'bank_name'] }] });
  if (!reconciliation) throw ErrorApi.notFound('مغایرت‌گیری پیدا نشد');
  return { ...plain(reconciliation), summary: await summary(reconciliation) };
}
async function listLines(id, { page = 1, limit = 20 }) {
  const reconciliation = await BankReconciliation.findByPk(id, { attributes: ['id'] });
  if (!reconciliation) throw ErrorApi.notFound('مغایرت‌گیری پیدا نشد');
  const result = await BankReconciliationLine.findAndCountAll({ where: { reconciliation_id: id }, include: [{ model: JournalLine, as: 'matchedJournalLine', include: [{ model: JournalEntry, as: 'entry', attributes: ['id', 'entry_no', 'entry_date', 'description'] }] }], order: [['transaction_date', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']], limit, offset: (page - 1) * limit });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function candidates(id, { lineId, search = '', page = 1, limit = 20 }) {
  const reconciliation = await BankReconciliation.findByPk(id);
  if (!reconciliation) throw ErrorApi.notFound('مغایرت‌گیری پیدا نشد');
  const statementLine = await BankReconciliationLine.findOne({ where: { id: lineId, reconciliation_id: id } });
  if (!statementLine) throw ErrorApi.notFound('ردیف صورت‌حساب پیدا نشد');
  const lines = await bookLines(reconciliation, undefined, statementLine.transaction_date);
  const matchingLines = lines.filter((line) => BigInt(line.debit) - BigInt(line.credit) === BigInt(statementLine.amount));
  const matchingIds = matchingLines.map((line) => line.id);
  const matched = matchingIds.length ? await BankReconciliationLine.findAll({ where: { matched_journal_line_id: { [Op.in]: matchingIds } }, attributes: ['matched_journal_line_id'] }) : [];
  const matchedIds = new Set(matched.map((line) => line.matched_journal_line_id));
  const term = String(search || '').trim().toLocaleLowerCase();
  const candidates = matchingLines.filter((line) => !matchedIds.has(line.id)).map((line) => ({ id: line.id, date: line.entry.entry_date, entryNo: line.entry.entry_no, description: line.description || line.entry.description, amount: (BigInt(line.debit) - BigInt(line.credit)).toString() })).filter((line) => !term || `${line.entryNo} ${line.description}`.toLocaleLowerCase().includes(term));
  return { items: candidates.slice((page - 1) * limit, page * limit), pagination: { page, limit, totalItems: candidates.length, totalPages: Math.ceil(candidates.length / limit) } };
}
async function addLine(id, data) {
  return sequelize.transaction(async (transaction) => {
    const reconciliation = await BankReconciliation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!reconciliation) throw ErrorApi.notFound('مغایرت‌گیری پیدا نشد');
    if (reconciliation.status !== 'DRAFT') throw ErrorApi.conflict('مغایرت نهایی شده و امکان ویرایش ندارد');
    if (data.transactionDate < reconciliation.start_date || data.transactionDate > reconciliation.end_date) throw ErrorApi.badRequest('تاریخ ردیف باید داخل بازهٔ مغایرت‌گیری باشد');
    signedAmount(data.amount);
    return plain(await BankReconciliationLine.create({ reconciliation_id: id, transaction_date: data.transactionDate, description: data.description, reference: data.reference || null, amount: data.amount }, { transaction }));
  });
}
async function updateLine(id, lineId, data) {
  return sequelize.transaction(async (transaction) => {
    const reconciliation = await BankReconciliation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!reconciliation) throw ErrorApi.notFound('مغایرت‌گیری پیدا نشد');
    if (reconciliation.status !== 'DRAFT') throw ErrorApi.conflict('مغایرت نهایی شده و امکان ویرایش ندارد');
    const line = await BankReconciliationLine.findOne({ where: { id: lineId, reconciliation_id: id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!line) throw ErrorApi.notFound('ردیف صورت‌حساب پیدا نشد');
    if (data.transactionDate < reconciliation.start_date || data.transactionDate > reconciliation.end_date) throw ErrorApi.badRequest('تاریخ ردیف باید داخل بازهٔ مغایرت‌گیری باشد');
    signedAmount(data.amount);
    await line.update({ transaction_date: data.transactionDate, description: data.description, reference: data.reference || null, amount: data.amount, matched_journal_line_id: null }, { transaction });
    return plain(line);
  });
}
async function deleteLine(id, lineId) {
  return sequelize.transaction(async (transaction) => {
    const reconciliation = await BankReconciliation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!reconciliation) throw ErrorApi.notFound('مغایرت‌گیری پیدا نشد');
    if (reconciliation.status !== 'DRAFT') throw ErrorApi.conflict('مغایرت نهایی شده و امکان حذف ردیف ندارد');
    const line = await BankReconciliationLine.findOne({ where: { id: lineId, reconciliation_id: id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!line) throw ErrorApi.notFound('ردیف صورت‌حساب پیدا نشد');
    await line.destroy({ transaction });
    return { id: lineId, deleted: true };
  });
}
async function matchLine(id, lineId, journalLineId) {
  return sequelize.transaction(async (transaction) => {
    const reconciliation = await BankReconciliation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!reconciliation || reconciliation.status !== 'DRAFT') throw ErrorApi.conflict('مغایرت پیدا نشد یا نهایی شده است');
    const statementLine = await BankReconciliationLine.findOne({ where: { id: lineId, reconciliation_id: id }, transaction, lock: transaction.LOCK.UPDATE });
    const journalLine = await JournalLine.findByPk(journalLineId, { include: [{ model: JournalEntry, as: 'entry', where: { status: 'POSTED' }, required: true }], transaction, lock: transaction.LOCK.UPDATE });
    if (!statementLine || !journalLine) throw ErrorApi.notFound('ردیف صورت‌حساب یا سند پیدا نشد');
    if (statementLine.transaction_date !== journalLine.entry.entry_date || BigInt(statementLine.amount) !== BigInt(journalLine.debit) - BigInt(journalLine.credit) || !journalLine.treasury_account_id || journalLine.treasury_account_id !== reconciliation.treasury_account_id) throw ErrorApi.badRequest('ردیف بانکی و سند باید از نظر حساب، تاریخ و مبلغ دقیقاً یکسان باشند');
    const used = await BankReconciliationLine.findOne({ where: { matched_journal_line_id: journalLineId }, transaction, lock: transaction.LOCK.UPDATE });
    if (used && used.id !== statementLine.id) throw ErrorApi.conflict('این سند قبلاً با ردیف دیگری تطبیق داده شده است');
    await statementLine.update({ matched_journal_line_id: journalLineId }, { transaction });
    return plain(statementLine);
  });
}
async function finalize(id, userId) {
  return sequelize.transaction(async (transaction) => {
    const reconciliation = await BankReconciliation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!reconciliation) throw ErrorApi.notFound('مغایرت‌گیری پیدا نشد');
    if (reconciliation.status !== 'DRAFT') throw ErrorApi.conflict('این مغایرت‌گیری قبلاً نهایی شده است');
    const result = await summary(reconciliation, transaction);
    if (result.unmatchedStatementLines) throw ErrorApi.conflict('ابتدا همهٔ ردیف‌های صورت‌حساب را با اسناد دفتر کل تطبیق دهید', result);
    if (BigInt(result.statementInputDifference) !== 0n) throw ErrorApi.conflict('ماندهٔ پایان صورت‌حساب با ماندهٔ آغازین و ردیف‌های ثبت‌شده برابر نیست', result);
    if (BigInt(result.difference) !== 0n) throw ErrorApi.conflict('ماندهٔ صورت‌حساب پس از احتساب اقلام در راه با دفتر کل برابر نیست', result);
    await reconciliation.update({ status: 'RECONCILED', reconciled_by: userId, reconciled_at: new Date() }, { transaction });
    return { ...plain(reconciliation), summary: result };
  });
}
module.exports = { list, create, get, listLines, candidates, addLine, updateLine, deleteLine, matchLine, finalize };
