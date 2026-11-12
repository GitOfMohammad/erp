const crypto = require('node:crypto');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../../../core/database/db');
const { CashVoucher, CustomerCheque, CompanyCheckbook, CompanyCheque, TreasuryAccount, FinancialAccount, CommercialPartner, CommercialDocument, DirectPartnerSettlement, DirectPartnerSettlementAllocation, JournalEntry } = require('../../../core/database/models');
const ErrorApi = require('../../../core/api/ErrorApi');
const ledger = require('../gl/ledger.service');
const treasury = require('../banking/treasury.service');
const plain = (value) => value?.get ? value.get({ plain: true }) : value;
const dateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
const CATEGORIES = {
  RECEIPT: [
    { value: 'CUSTOMER_RECEIPT', label: 'دریافت از مشتری بابت فروش', accountCode: '1100', partnerRequired: true },
    { value: 'CUSTOMER_ADVANCE', label: 'پیش‌دریافت از مشتری', accountCode: '2020', partnerRequired: true },
    { value: 'OTHER_INCOME', label: 'درآمد متفرقه', accountCode: '4200' },
    { value: 'CAPITAL_CONTRIBUTION', label: 'آورده / افزایش سرمایه', accountCode: '3010' },
    { value: 'LOAN_RECEIVED', label: 'دریافت وام', accountCode: '2010' },
  ],
  PAYMENT: [
    { value: 'GENERAL_EXPENSE', label: 'هزینه‌های عمومی', accountCode: '6100' },
    { value: 'SALARY', label: 'حقوق و دستمزد', accountCode: '6200' },
    { value: 'TAX_PAYMENT', label: 'پرداخت مالیات ثبت‌شده', accountCode: '2100' },
    { value: 'LOAN_REPAYMENT', label: 'بازپرداخت وام', accountCode: '2010' },
    { value: 'SUPPLIER_ADVANCE', label: 'پیش‌پرداخت به تأمین‌کننده', accountCode: '1400', partnerRequired: true },
  ],
};
function voucherNumber(direction, date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(`${date}T12:00:00`));
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${direction === 'RECEIPT' ? 'RC' : 'PY'}-${get('year')}${get('month')}${get('day')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
function customerChequeNumber(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(`${date}T12:00:00`));
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `RC-${get('year')}${get('month')}${get('day')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
async function options() {
  return { checkBanks: ['بانک ملی ایران','بانک سپه','بانک تجارت','بانک ملت','بانک صادرات ایران','بانک مسکن','بانک کشاورزی','بانک رفاه کارگران','بانک صنعت و معدن','بانک توسعه صادرات ایران','بانک توسعه تعاون','پست بانک ایران','بانک پاسارگاد','بانک پارسیان','بانک کارآفرین','بانک سامان','بانک اقتصاد نوین','بانک سرمایه','بانک شهر','بانک دی','بانک گردشگری','بانک ایران زمین','بانک خاورمیانه','بانک قرض‌الحسنه مهر ایران','بانک قرض‌الحسنه رسالت','بانک آینده','بانک سینا','بانک حکمت ایرانیان','بانک گردشگری'], categories: { RECEIPT: CATEGORIES.RECEIPT.map(({ value, label, partnerRequired }) => ({ value, label, partnerRequired: Boolean(partnerRequired) })), PAYMENT: CATEGORIES.PAYMENT.map(({ value, label, partnerRequired }) => ({ value, label, partnerRequired: Boolean(partnerRequired) })) } };
}
async function listOptions(kind, { page, limit, search = '' }) {
  const term = String(search || '').trim();
  const where = kind === 'treasury-accounts' ? { is_active: 1 } : kind === 'partners' ? { is_active: 1, deleted_at: null } : { is_active: 1, is_postable: 1 };
  if (term) where[Op.or] = [{ name: { [Op.like]: `%${term}%` } }, { code: { [Op.like]: `%${term}%` } }];
  if (kind === 'treasury-accounts') {
    const result = await TreasuryAccount.findAndCountAll({ where, attributes: ['id', 'code', 'name', 'account_type'], limit, offset: (page - 1) * limit, order: [['name', 'ASC']] });
    return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
  }
  if (kind === 'partners') {
    const result = await CommercialPartner.findAndCountAll({ where, attributes: ['id', 'name', 'partner_type'], limit, offset: (page - 1) * limit, order: [['name', 'ASC']] });
    return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
  }
  if (kind !== 'payment-accounts') throw ErrorApi.badRequest('نوع فهرست گزینه‌ها معتبر نیست');
  const mappings = await TreasuryAccount.findAll({ where: { is_active: 1 }, attributes: ['financial_account_id'], raw: true });
  const treasuryIds = mappings.map((item) => item.financial_account_id).filter(Boolean);
  if (treasuryIds.length) where.id = { [Op.notIn]: treasuryIds };
  const result = await FinancialAccount.findAndCountAll({ where, attributes: ['id', 'code', 'name', 'account_type', 'parent_id'], limit, offset: (page - 1) * limit, order: [['code', 'ASC']] });
  const ancestors = new Map(result.rows.map((item) => [item.id, plain(item)]));
  let parentIds = [...new Set(result.rows.map((item) => item.parent_id).filter(Boolean))];
  while (parentIds.length) {
    const missing = parentIds.filter((id) => !ancestors.has(id));
    if (!missing.length) break;
    const parents = await FinancialAccount.findAll({ where: { id: { [Op.in]: missing } }, attributes: ['id', 'name', 'parent_id'], raw: true });
    parents.forEach((item) => ancestors.set(item.id, item));
    parentIds = parents.map((item) => item.parent_id).filter(Boolean);
  }
  const items = result.rows.map((item) => {
    const account = plain(item);
    const path = [account.name];
    let parentId = account.parent_id;
    while (parentId && ancestors.has(parentId)) { const parent = ancestors.get(parentId); path.unshift(parent.name); parentId = parent.parent_id; }
    return { ...account, account_path: path.join(' / ') };
  });
  return { items, pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function list({ direction, page, limit, from, to }) {
  const where = { direction };
  if (from || to) where.entry_date = { ...(from ? { [Op.gte]: dateOnly(from) } : {}), ...(to ? { [Op.lte]: dateOnly(to) } : {}) };
  const result = await CashVoucher.findAndCountAll({ where, include: [
    { model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'account_type'] },
    { model: FinancialAccount, as: 'counterpartAccount', attributes: ['id', 'code', 'name', 'account_type'] },
    { model: CommercialPartner, as: 'partner', attributes: ['id', 'name'] },
    { model: CashVoucher, as: 'reversal', attributes: ['id', 'voucher_no'] },
  ], limit, offset: (page - 1) * limit, order: [['entry_date', 'DESC'], ['created_at', 'DESC']] });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function listCustomerCheques({ status = 'HELD', search = '', page = 1, limit = 20 }) {
  const where = status === 'ALL' ? {} : { status };
  const term = String(search || '').trim();
  if (term) {
    const matchingPartners = await CommercialPartner.findAll({ where: { name: { [Op.like]: `%${term}%` } }, attributes: ['id'], raw: true, limit: 100 });
    where[Op.or] = [
    { cheque_no: { [Op.like]: `%${term}%` } }, { check_number: { [Op.like]: `%${term}%` } },
    { bank_name: { [Op.like]: `%${term}%` } }, { sayad_id: { [Op.like]: `%${term}%` } },
    ...(matchingPartners.length ? [{ issuer_partner_id: { [Op.in]: matchingPartners.map((partner) => partner.id) } }] : []),
    ];
  }
  const result = await CustomerCheque.findAndCountAll({ where, distinct: true, include: [
    { model: CommercialPartner, as: 'issuer', attributes: ['id', 'code', 'name'] },
    { model: CommercialPartner, as: 'transferredToPartner', attributes: ['id', 'code', 'name'] },
  ], order: [['check_date', 'ASC'], ['created_at', 'ASC']], limit, offset: (page - 1) * limit });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function receiveCustomerCheque(data, userId) {
  return sequelize.transaction(async (transaction) => {
    const amount = ledger.amount(data.amount, 'مبلغ چک');
    const partner = await CommercialPartner.findOne({ where: { id: data.partnerId, is_active: 1, deleted_at: null }, transaction, lock: transaction.LOCK.UPDATE });
    if (!partner || !['CUSTOMER', 'BOTH'].includes(partner.partner_type)) throw ErrorApi.badRequest('صادرکنندهٔ چک باید مشتری فعال باشد');
    const duplicate = await CustomerCheque.findOne({ where: { [Op.or]: [
      ...(data.sayadId ? [{ sayad_id: data.sayadId }] : []),
      { bank_name: data.bankName.trim(), check_number: data.checkNumber.trim() },
    ] }, transaction, lock: transaction.LOCK.UPDATE });
    if (duplicate) throw ErrorApi.conflict('این چک قبلاً در سیستم ثبت شده است');
    const checkAsset = await FinancialAccount.findOne({ where: { code: '1020', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    const receivable = await FinancialAccount.findOne({ where: { code: '1100', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!checkAsset || !receivable) throw ErrorApi.internalServerError('حساب‌های اسناد دریافتنی و دریافتنی تجاری تعریف نشده‌اند');
    const id = crypto.randomUUID();
    const entryDate = dateOnly(data.entryDate);
    const chequeNo = customerChequeNumber(entryDate);
    const description = data.description.trim();
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'CUSTOMER_CHEQUE_RECEIPT', sourceId: id, entryDate, description: `${chequeNo} - ${description}`, createdBy: userId, lines: [
      { accountId: checkAsset.id, debit: amount.toString(), credit: '0' },
      { accountId: receivable.id, partnerId: partner.id, debit: '0', credit: amount.toString() },
    ], transaction });
    const cheque = await CustomerCheque.create({
      id, cheque_no: chequeNo, bank_name: data.bankName.trim(), check_number: data.checkNumber.trim(),
      account_number: data.accountNumber || null, sayad_id: data.sayadId || null,
      check_date: dateOnly(data.checkDate), received_date: entryDate, amount: amount.toString(), status: 'HELD',
      issuer_partner_id: partner.id, receipt_journal_entry_id: journalEntry.id, created_by: userId,
    }, { transaction });
    return { ...plain(cheque), issuer: plain(partner), receiptJournalEntry: plain(journalEntry) };
  });
}
async function transferCustomerCheque(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const cheque = await CustomerCheque.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!cheque) throw ErrorApi.notFound('چک دریافتی پیدا نشد');
    if (cheque.status !== 'HELD') throw ErrorApi.conflict('فقط چک‌های نزد صندوق قابل واگذاری هستند');
    const payee = await CommercialPartner.findOne({ where: { id: data.payeePartnerId, is_active: 1, deleted_at: null }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payee || !['SUPPLIER', 'BOTH'].includes(payee.partner_type)) throw ErrorApi.badRequest('گیرندهٔ چک باید تأمین‌کنندهٔ فعال باشد');
    const payable = await FinancialAccount.findOne({ where: { code: '2000', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    const checkAsset = await FinancialAccount.findOne({ where: { code: '1020', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payable || !checkAsset) throw ErrorApi.internalServerError('حساب‌های پرداختنی و اسناد دریافتنی تعریف نشده‌اند');
    const transferNo = `CT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const transferDate = dateOnly(data.entryDate);
    const description = data.description.trim();
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'CUSTOMER_CHEQUE_TRANSFER', sourceId: cheque.id, entryDate: transferDate, description: `${transferNo} - ${description}`, createdBy: userId, lines: [
      { accountId: payable.id, partnerId: payee.id, debit: cheque.amount, credit: '0' },
      { accountId: checkAsset.id, debit: '0', credit: cheque.amount },
    ], transaction });
    await cheque.update({ status: 'TRANSFERRED', transfer_no: transferNo, transfer_journal_entry_id: journalEntry.id, transferred_to_partner_id: payee.id, transfer_date: transferDate, reference: data.reference || null, description }, { transaction });
    return { ...plain(cheque), transferredToPartner: plain(payee), transferJournalEntry: plain(journalEntry) };
  });
}
function numberedCheck(book, value) {
  return `${book.number_prefix || ''}${String(value).padStart(Number(book.number_width), '0')}`;
}
async function listCompanyCheckbooks({ page = 1, limit = 20 } = {}) {
  const result = await CompanyCheckbook.findAndCountAll({ where: { is_active: 1 }, include: [
    { model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'bank_name', 'account_type'] },
  ], order: [['created_at', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit });
  const bookIds = result.rows.map((book) => book.id);
  const issuedRows = bookIds.length ? await CompanyCheque.findAll({ where: { checkbook_id: { [Op.in]: bookIds } }, attributes: ['checkbook_id', [sequelize.fn('COUNT', sequelize.col('id')), 'issued_count']], group: ['checkbook_id'], raw: true }) : [];
  const issuedCounts = new Map(issuedRows.map((row) => [row.checkbook_id, Number(row.issued_count)]));
  const items = result.rows.map((book) => ({ ...plain(book), number_count: (BigInt(book.number_end) - BigInt(book.number_start) + 1n).toString(), issued_count: issuedCounts.get(book.id) || 0 }));
  return { items, pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function createCompanyCheckbook(data, userId) {
  const start = BigInt(data.numberStart);
  const end = BigInt(data.numberEnd);
  if (data.numberStart.length !== data.numberEnd.length) throw ErrorApi.badRequest('شمارهٔ شروع و پایان باید تعداد رقم یکسانی داشته باشند');
  if (end < start || end - start > 4999n) throw ErrorApi.badRequest('بازهٔ دسته‌چک باید حداکثر ۵۰۰۰ شماره و از ابتدا تا انتها معتبر باشد');
  return sequelize.transaction(async (transaction) => {
    const account = await TreasuryAccount.findOne({ where: { id: data.treasuryAccountId, account_type: 'BANK', is_active: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!account) throw ErrorApi.badRequest('برای دسته‌چک، حساب بانکی فعال شرکت را انتخاب کنید');
    const books = await CompanyCheckbook.findAll({ where: { treasury_account_id: account.id, number_prefix: (data.numberPrefix || '').trim(), is_active: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (books.some((book) => start <= BigInt(book.number_end) && end >= BigInt(book.number_start))) throw ErrorApi.conflict('این بازهٔ شماره قبلاً برای همین بانک و پیشوند دسته‌چک ثبت شده است');
    const book = await CompanyCheckbook.create({ name: data.name.trim(), treasury_account_id: account.id, number_prefix: (data.numberPrefix || '').trim(), number_start: start.toString(), number_end: end.toString(), number_width: data.numberStart.length, created_by: userId }, { transaction });
    return { ...plain(book), treasuryAccount: plain(account) };
  });
}
async function availableCompanyCheckNumbers(id, search = '') {
  const book = await CompanyCheckbook.findOne({ where: { id, is_active: 1 } });
  if (!book) throw ErrorApi.notFound('دسته‌چک فعال پیدا نشد');
  const issued = await CompanyCheque.findAll({ where: { checkbook_id: id }, attributes: ['check_number'], raw: true });
  const used = new Set(issued.map((row) => row.check_number));
  const needle = String(search || '').trim();
  const result = [];
  for (let value = BigInt(book.number_start); value <= BigInt(book.number_end) && result.length < 200; value += 1n) {
    const checkNumber = numberedCheck(book, value);
    if (!used.has(checkNumber) && (!needle || checkNumber.includes(needle))) result.push({ id: checkNumber, check_number: checkNumber, label: `${book.number_prefix || ''}${checkNumber}` });
  }
  return result;
}
async function listCompanyCheques({ status = 'ALL' } = {}) {
  const where = status === 'ALL' ? {} : { status };
  const rows = await CompanyCheque.findAll({ where, include: [
    { model: CommercialPartner, as: 'recipient', attributes: ['id', 'code', 'name'] },
    { model: CompanyCheckbook, as: 'checkbook', include: [{ model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'bank_name'] }] },
  ], order: [['issue_date', 'DESC'], ['created_at', 'DESC']], limit: 500 });
  return rows.map(plain);
}
async function listChequeRegister({ direction, page, limit }) {
  const sources = `
    SELECT 'VOUCHER' AS source, id, entry_date AS sort_date, created_at, amount, NULL AS cheque_status
    FROM financial_cash_vouchers WHERE direction = :direction AND method = 'CHEQUE'
    UNION ALL
    SELECT 'CUSTOMER' AS source, id, IF(:direction = 'RECEIPT', received_date, transfer_date) AS sort_date, created_at, amount, status AS cheque_status
    FROM financial_customer_cheques
    WHERE (:direction = 'RECEIPT' AND status <> 'TRANSFERRED') OR (:direction = 'PAYMENT' AND status = 'TRANSFERRED')
    UNION ALL
    SELECT 'COMPANY' AS source, id, issue_date AS sort_date, created_at, amount, status AS cheque_status
    FROM financial_company_cheques WHERE :direction = 'PAYMENT'`;
  const replacements = { direction, limit, offset: (page - 1) * limit };
  const aggregates = await sequelize.query(`SELECT cheque_status, COUNT(*) AS item_count, SUM(amount) AS amount_total FROM (${sources}) AS cheque_rows GROUP BY cheque_status`, { type: QueryTypes.SELECT, replacements });
  const totalItems = aggregates.reduce((sum, row) => sum + Number(row.item_count || 0), 0);
  const totalAmount = aggregates.reduce((sum, row) => sum + BigInt(String(row.amount_total || 0)), 0n);
  const statusCounts = Object.fromEntries(aggregates.map(row => [row.cheque_status || 'UNKNOWN', Number(row.item_count || 0)]));
  const selected = await sequelize.query(`SELECT source, id FROM (${sources}) AS cheque_rows ORDER BY sort_date DESC, created_at DESC, source ASC, id ASC LIMIT :limit OFFSET :offset`, { type: QueryTypes.SELECT, replacements });
  const ids = source => selected.filter(row => row.source === source).map(row => row.id);
  const [voucherRows, customerRows, companyRows] = await Promise.all([
    ids('VOUCHER').length ? CashVoucher.findAll({ where: { id: ids('VOUCHER') }, include: [
      { model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'account_type', 'bank_name'] },
      { model: CommercialPartner, as: 'partner', attributes: ['id', 'name'] },
      { model: CashVoucher, as: 'reversal', attributes: ['id', 'voucher_no'] },
    ] }) : [],
    ids('CUSTOMER').length ? CustomerCheque.findAll({ where: { id: ids('CUSTOMER') }, include: [
      { model: CommercialPartner, as: 'issuer', attributes: ['id', 'code', 'name'] },
      { model: CommercialPartner, as: 'transferredToPartner', attributes: ['id', 'code', 'name'] },
    ] }) : [],
    ids('COMPANY').length ? CompanyCheque.findAll({ where: { id: ids('COMPANY') }, include: [
      { model: CommercialPartner, as: 'recipient', attributes: ['id', 'code', 'name'] },
      { model: CompanyCheckbook, as: 'checkbook', include: [{ model: TreasuryAccount, as: 'treasuryAccount', attributes: ['id', 'code', 'name', 'bank_name'] }] },
    ] }) : [],
  ]);
  const byId = rows => new Map(rows.map(row => [String(row.id), plain(row)]));
  const vouchers = byId(voucherRows), customers = byId(customerRows), companies = byId(companyRows);
  const items = selected.map(row => {
    if (row.source === 'VOUCHER') return vouchers.get(String(row.id));
    if (row.source === 'CUSTOMER') {
      const cheque = customers.get(String(row.id));
      return { ...cheque, method: 'CHEQUE', voucher_no: direction === 'PAYMENT' ? cheque.transfer_no : cheque.cheque_no, entry_date: direction === 'PAYMENT' ? cheque.transfer_date : cheque.received_date, cheque_status: cheque.status, partner: direction === 'PAYMENT' ? cheque.transferredToPartner : cheque.issuer, method_details: { bankName: cheque.bank_name, checkNumber: cheque.check_number, sayadId: cheque.sayad_id, checkDate: cheque.check_date }, reference: cheque.check_number };
    }
    const cheque = companies.get(String(row.id));
    return { ...cheque, method: 'CHEQUE', voucher_no: cheque.cheque_no, entry_date: cheque.issue_date, cheque_status: cheque.status, partner: cheque.recipient, method_details: { bankName: cheque.checkbook?.treasuryAccount?.bank_name || cheque.checkbook?.treasuryAccount?.name, checkNumber: cheque.check_number, sayadId: cheque.sayad_id, checkDate: cheque.check_date }, is_company_cheque: true };
  }).filter(Boolean);
  return { items, pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit), totalAmount: totalAmount.toString(), statusCounts } };
}
async function issueCompanyCheque(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const book = await CompanyCheckbook.findOne({ where: { id, is_active: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!book) throw ErrorApi.notFound('دسته‌چک فعال پیدا نشد');
    const numberValue = String(data.checkNumber).startsWith(book.number_prefix || '') ? String(data.checkNumber).slice((book.number_prefix || '').length) : '';
    if (!/^\d+$/.test(numberValue) || BigInt(numberValue) < BigInt(book.number_start) || BigInt(numberValue) > BigInt(book.number_end) || numberedCheck(book, BigInt(numberValue)) !== data.checkNumber) throw ErrorApi.badRequest('شماره چک در بازهٔ این دسته‌چک نیست');
    if (await CompanyCheque.findOne({ where: { checkbook_id: book.id, check_number: data.checkNumber }, transaction, lock: transaction.LOCK.UPDATE })) throw ErrorApi.conflict('این شماره چک قبلاً استفاده شده است');
    const payee = await CommercialPartner.findOne({ where: { id: data.payeePartnerId, is_active: 1, deleted_at: null }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payee || !['SUPPLIER', 'BOTH'].includes(payee.partner_type)) throw ErrorApi.badRequest('گیرندهٔ چک باید تأمین‌کنندهٔ فعال باشد');
    const amount = ledger.amount(data.amount, 'مبلغ چک');
    if (amount <= 0n) throw ErrorApi.badRequest('مبلغ چک باید بزرگ‌تر از صفر باشد');
    const payable = await FinancialAccount.findOne({ where: { code: '2000', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    const issuedChecks = await FinancialAccount.findOne({ where: { code: '2110', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payable || !issuedChecks) throw ErrorApi.internalServerError('حساب‌های پرداختنی و چک‌های پرداختنی تعریف نشده‌اند');
    const chequeId = crypto.randomUUID();
    const issueDate = dateOnly(data.entryDate);
    const chequeNo = `CP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const description = data.description.trim();
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'COMPANY_CHEQUE_ISSUE', sourceId: chequeId, entryDate: issueDate, description: `${chequeNo} - ${description}`, createdBy: userId, lines: [
      { accountId: payable.id, partnerId: payee.id, debit: amount.toString(), credit: '0' },
      { accountId: issuedChecks.id, debit: '0', credit: amount.toString() },
    ], transaction });
    const cheque = await CompanyCheque.create({ id: chequeId, checkbook_id: book.id, check_number: data.checkNumber, cheque_no: chequeNo, sayad_id: data.sayadId || null, issue_date: issueDate, check_date: dateOnly(data.checkDate), amount: amount.toString(), status: 'ISSUED', recipient_partner_id: payee.id, issue_journal_entry_id: journalEntry.id, description, created_by: userId }, { transaction });
    return { ...plain(cheque), recipient: plain(payee), checkbook: plain(book), issueJournalEntry: plain(journalEntry) };
  });
}
async function clearCompanyCheque(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const cheque = await CompanyCheque.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!cheque) throw ErrorApi.notFound('چک پرداختی پیدا نشد');
    if (cheque.status !== 'ISSUED') throw ErrorApi.conflict('فقط چک صادرشده و وصول‌نشده را می‌توان وصول کرد');
    const book = await CompanyCheckbook.findByPk(cheque.checkbook_id, { transaction, lock: transaction.LOCK.UPDATE });
    const bank = book && await TreasuryAccount.findOne({ where: { id: book.treasury_account_id, is_active: 1, account_type: 'BANK' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!bank) throw ErrorApi.conflict('حساب بانکی دسته‌چک فعال نیست');
    const amount = BigInt(cheque.amount);
    const available = await treasury.balance(bank.id, transaction);
    if (available < amount) throw ErrorApi.conflict('موجودی حساب بانکی برای وصول چک کافی نیست', { available: available.toString(), requested: amount.toString() });
    const liability = await FinancialAccount.findOne({ where: { code: '2110', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!liability) throw ErrorApi.internalServerError('حساب چک‌های پرداختنی تعریف نشده است');
    const entryDate = dateOnly(data.entryDate);
    const description = data.description.trim();
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'COMPANY_CHEQUE_CLEARANCE', sourceId: cheque.id, entryDate, description, createdBy: userId, lines: [
      { accountId: liability.id, debit: amount.toString(), credit: '0' },
      { accountId: bank.financial_account_id, treasuryAccountId: bank.id, debit: '0', credit: amount.toString() },
    ], transaction });
    await cheque.update({ status: 'CLEARED', clearance_date: entryDate, clearance_journal_entry_id: journalEntry.id }, { transaction });
    return { ...plain(cheque), checkbook: plain(book), treasuryAccount: plain(bank), clearanceJournalEntry: plain(journalEntry) };
  });
}
async function returnCompanyCheque(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const cheque = await CompanyCheque.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!cheque) throw ErrorApi.notFound('چک پرداختی پیدا نشد');
    if (cheque.status !== 'ISSUED') throw ErrorApi.conflict('فقط چک صادرشده و وصول‌نشده را می‌توان برگشت زد');
    const liability = await FinancialAccount.findOne({ where: { code: '2110', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    const payable = await FinancialAccount.findOne({ where: { code: '2000', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!liability || !payable) throw ErrorApi.internalServerError('حساب‌های چک پرداختنی و پرداختنی تعریف نشده‌اند');
    const entryDate = dateOnly(data.entryDate);
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'COMPANY_CHEQUE_RETURN', sourceId: cheque.id, entryDate, description: data.description.trim(), createdBy: userId, lines: [
      { accountId: liability.id, debit: cheque.amount, credit: '0' },
      { accountId: payable.id, partnerId: cheque.recipient_partner_id, debit: '0', credit: cheque.amount },
    ], transaction });
    await cheque.update({ status: 'RETURNED', return_date: entryDate, return_journal_entry_id: journalEntry.id }, { transaction });
    return { ...plain(cheque), returnJournalEntry: plain(journalEntry) };
  });
}
async function create(direction, data, userId) {
  return sequelize.transaction(async (transaction) => {
    if (data.method === 'OTHER') throw ErrorApi.badRequest('پرداخت یا دریافت بین طرف‌حساب‌ها را از بخش تسویهٔ مستقیم ثبت کنید');
    const amount = ledger.amount(data.amount, 'مبلغ');
    if (amount <= 0n) throw ErrorApi.badRequest('مبلغ باید بزرگ‌تر از صفر باشد');
    let category = CATEGORIES[direction].find((item) => item.value === data.category);
    let counterpart = null;
    let partnerId = null;
    if (direction === 'PAYMENT' && data.paymentTargetType === 'ACCOUNT') {
      if (!data.counterpartAccountId || data.partnerId) throw ErrorApi.badRequest('برای پرداخت هزینه، فقط یک حساب قابل ثبت انتخاب کنید');
      counterpart = await FinancialAccount.findByPk(data.counterpartAccountId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!counterpart || Number(counterpart.is_active) !== 1 || Number(counterpart.is_postable) !== 1) throw ErrorApi.badRequest('حساب انتخاب‌شده فعال یا قابل ثبت نیست');
      const linkedTreasury = await TreasuryAccount.findOne({ where: { financial_account_id: counterpart.id, is_active: 1 }, transaction, lock: transaction.LOCK.UPDATE });
      if (linkedTreasury) throw ErrorApi.badRequest('برای پرداخت، حساب خزانه را در بخش «پرداخت از حساب» انتخاب کنید');
      category = { value: 'ACCOUNT_PAYMENT', label: 'پرداخت هزینه از حساب انتخاب‌شده', accountCode: null };
    } else if (direction === 'PAYMENT' && data.paymentTargetType === 'PARTNER') {
      if (!data.partnerId || data.counterpartAccountId) throw ErrorApi.badRequest('برای پرداخت به طرف‌حساب، یک طرف‌حساب انتخاب کنید');
      const partner = await CommercialPartner.findOne({ where: { id: data.partnerId, is_active: 1, deleted_at: null }, transaction, lock: transaction.LOCK.UPDATE });
      if (!partner || !['SUPPLIER', 'BOTH'].includes(partner.partner_type)) throw ErrorApi.badRequest('برای پرداخت به طرف‌حساب، تأمین‌کنندهٔ فعال انتخاب کنید');
      partnerId = partner.id;
      counterpart = await FinancialAccount.findOne({ where: { code: '2000', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
      if (!counterpart) throw ErrorApi.internalServerError('حساب پرداختنی تأمین‌کنندگان تعریف نشده است');
      category = { value: 'PARTNER_PAYMENT', label: 'پرداخت به تأمین‌کننده', accountCode: null };
    } else if (!category) {
      throw ErrorApi.badRequest('نوع دریافت یا پرداخت معتبر نیست');
    }
    if (!category) throw ErrorApi.badRequest('نوع دریافت یا پرداخت معتبر نیست');
    const account = await TreasuryAccount.findByPk(data.treasuryAccountId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!account || Number(account.is_active) !== 1) throw ErrorApi.badRequest('حساب خزانه فعال پیدا نشد');
    if (['CASH', 'PETTY_CASH'].includes(account.account_type) && data.method !== 'CASH' && data.method !== 'OTHER') throw ErrorApi.badRequest('برای صندوق یا تنخواه، روش باید نقدی یا سایر باشد');
    if (account.account_type === 'BANK' && data.method === 'CASH') throw ErrorApi.badRequest('برای حساب بانکی، روش نقدی انتخاب نشود');
    if (!counterpart) counterpart = await FinancialAccount.findOne({ where: { code: category.accountCode, is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!counterpart) throw ErrorApi.internalServerError(`حساب سیستمی ${category.accountCode} تعریف نشده است`);
    if (category.partnerRequired && !data.partnerId) throw ErrorApi.badRequest('برای این نوع سند، طرف حساب را انتخاب کنید');
    if (data.partnerId) {
      const partner = await CommercialPartner.findOne({ where: { id: data.partnerId, is_active: 1, deleted_at: null }, transaction, lock: transaction.LOCK.UPDATE });
      if (!partner) throw ErrorApi.badRequest('طرف حساب فعال پیدا نشد');
      if (category.value === 'CUSTOMER_ADVANCE' && !['CUSTOMER', 'BOTH'].includes(partner.partner_type)) throw ErrorApi.badRequest('برای پیش‌دریافت باید مشتری انتخاب شود');
      if (category.value === 'CUSTOMER_RECEIPT' && !['CUSTOMER', 'BOTH'].includes(partner.partner_type)) throw ErrorApi.badRequest('برای دریافت از مشتری باید مشتری فعال انتخاب شود');
      if (category.value === 'SUPPLIER_ADVANCE' && !['SUPPLIER', 'BOTH'].includes(partner.partner_type)) throw ErrorApi.badRequest('برای پیش‌پرداخت باید تأمین‌کننده انتخاب شود');
      partnerId = partner.id;
    }
    if (direction === 'PAYMENT') {
      const available = await treasury.balance(account.id, transaction);
      if (available < amount) throw ErrorApi.conflict('موجودی حساب خزانه برای این پرداخت کافی نیست', { available: available.toString(), requested: amount.toString() });
    }
    const id = crypto.randomUUID();
    const entryDate = dateOnly(data.entryDate);
    const voucherNo = voucherNumber(direction, entryDate);
    const description = data.description.trim();
    const lines = direction === 'RECEIPT'
      ? [{ accountId: account.financial_account_id, treasuryAccountId: account.id, debit: amount.toString(), credit: '0' }, { accountId: counterpart.id, partnerId, debit: '0', credit: amount.toString() }]
      : [{ accountId: counterpart.id, partnerId, debit: amount.toString(), credit: '0' }, { accountId: account.financial_account_id, treasuryAccountId: account.id, debit: '0', credit: amount.toString() }];
    const journalEntry = await ledger.createPostedEntry({ sourceType: `CASH_${direction}`, sourceId: id, entryDate, description: `${voucherNo} - ${description}`, createdBy: userId, lines, transaction });
    if (data.method === 'CHEQUE' && (!data.methodDetails?.checkNumber?.trim() || !data.methodDetails?.checkDate || !data.methodDetails?.bankName?.trim())) throw ErrorApi.badRequest('بانک صادرکننده، شماره چک و تاریخ چک الزامی است');
    const voucher = await CashVoucher.create({ id, voucher_no: voucherNo, direction, entry_date: entryDate, amount: amount.toString(), category: category.value, treasury_account_id: account.id, counterpart_account_id: counterpart.id, partner_id: partnerId, method: data.method, method_details: data.methodDetails || null, reference: data.reference || null, description, journal_entry_id: journalEntry.id, created_by: userId }, { transaction });
    return { ...plain(voucher), treasuryAccount: plain(account), counterpartAccount: plain(counterpart), partner: partnerId ? plain(await CommercialPartner.findByPk(partnerId, { transaction })) : null, journalEntry: plain(journalEntry) };
  });
}
async function reverse(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const original = await CashVoucher.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!original || original.reverses_voucher_id) throw ErrorApi.notFound('سند دریافت یا پرداخت برای برگشت پیدا نشد');
    const existing = await CashVoucher.findOne({ where: { reverses_voucher_id: original.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (existing) throw ErrorApi.conflict('این سند قبلاً برگشت داده شده است', { reversalVoucherNo: existing.voucher_no });
    const entryDate = dateOnly(data.entryDate);
    if (entryDate < String(original.entry_date).slice(0, 10)) throw ErrorApi.badRequest('تاریخ برگشت نمی‌تواند قبل از تاریخ سند اصلی باشد');
    const account = await TreasuryAccount.findByPk(original.treasury_account_id, { transaction, lock: transaction.LOCK.UPDATE });
    const counterpart = await FinancialAccount.findByPk(original.counterpart_account_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!account || Number(account.is_active) !== 1 || !counterpart || Number(counterpart.is_active) !== 1 || Number(counterpart.is_postable) !== 1) throw ErrorApi.conflict('برای برگشت، حساب خزانه و سرفصل مقابل باید فعال باشند');
    const amount = BigInt(original.amount);
    const direction = original.direction === 'RECEIPT' ? 'PAYMENT' : 'RECEIPT';
    if (direction === 'PAYMENT') {
      const available = await treasury.balance(account.id, transaction);
      if (available < amount) throw ErrorApi.conflict('موجودی حساب برای برگشت دریافت کافی نیست', { available: available.toString(), requested: amount.toString() });
    }
    const reversalId = crypto.randomUUID();
    const voucherNo = voucherNumber(direction, entryDate);
    const description = `برگشت ${original.voucher_no}: ${data.reason.trim()}`;
    const lines = direction === 'RECEIPT'
      ? [{ accountId: account.financial_account_id, treasuryAccountId: account.id, debit: amount.toString(), credit: '0' }, { accountId: counterpart.id, partnerId: original.partner_id, debit: '0', credit: amount.toString() }]
      : [{ accountId: counterpart.id, partnerId: original.partner_id, debit: amount.toString(), credit: '0' }, { accountId: account.financial_account_id, treasuryAccountId: account.id, debit: '0', credit: amount.toString() }];
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'CASH_VOUCHER_REVERSAL', sourceId: reversalId, entryDate, description: `${voucherNo} - ${description}`, createdBy: userId, lines, transaction });
    const reversal = await CashVoucher.create({ id: reversalId, voucher_no: voucherNo, direction, entry_date: entryDate, amount: original.amount, category: original.category, treasury_account_id: account.id, counterpart_account_id: counterpart.id, partner_id: original.partner_id, method: original.method, method_details: original.method_details, reference: original.reference, description, journal_entry_id: journalEntry.id, reverses_voucher_id: original.id, created_by: userId }, { transaction });
    return { ...plain(reversal), originalVoucher: plain(original), treasuryAccount: plain(account), counterpartAccount: plain(counterpart), journalEntry: plain(journalEntry) };
  });
}
function directVoucherNumber(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(`${date}T12:00:00`));
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `DP-${get('year')}${get('month')}${get('day')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
async function directOptions(kind, { page, limit, search = '' }) {
  if (!['customers', 'suppliers'].includes(kind)) throw ErrorApi.badRequest('نوع طرف‌حساب معتبر نیست');
  const partnerTypes = kind === 'customers' ? ['CUSTOMER', 'BOTH'] : ['SUPPLIER', 'BOTH'];
  const where = { is_active: 1, deleted_at: null, partner_type: { [Op.in]: partnerTypes } };
  const term = String(search || '').trim();
  if (term) where[Op.or] = [{ name: { [Op.like]: `%${term}%` } }, { code: { [Op.like]: `%${term}%` } }];
  const result = await CommercialPartner.findAndCountAll({ where, attributes: ['id', 'name', 'partner_type'], limit, offset: (page - 1) * limit, order: [['name', 'ASC']] });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function listDirect({ page, limit, from, to }) {
  const where = {};
  if (from || to) where.entry_date = { ...(from ? { [Op.gte]: dateOnly(from) } : {}), ...(to ? { [Op.lte]: dateOnly(to) } : {}) };
  const result = await DirectPartnerSettlement.findAndCountAll({ where, include: [
    { model: CommercialPartner, as: 'customer', attributes: ['id', 'name'] },
    { model: CommercialPartner, as: 'supplier', attributes: ['id', 'name'] },
    { model: DirectPartnerSettlement, as: 'reversal', attributes: ['id', 'voucher_no'] },
    { model: DirectPartnerSettlementAllocation, as: 'allocations', attributes: ['id', 'document_id', 'direction', 'amount'] },
  ], limit, offset: (page - 1) * limit, order: [['entry_date', 'DESC'], ['created_at', 'DESC']] });
  return { items: result.rows.map(plain), pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) } };
}
async function allocateToInvoices(partnerId, documentType, requested, transaction, settlementId, direction) {
  const docs = await CommercialDocument.findAll({ where: { partner_id: partnerId, document_type: documentType, status: 'APPROVED' }, attributes: ['id'], order: [['created_at', 'ASC'], ['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
  let remaining = requested;
  const allocations = [];
  for (const { id } of docs) {
    if (remaining <= 0n) break;
    const detail = await CommercialDocument.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    const summary = await require('../../../modules/commercial/commercial.service').getFinancialSummaryForAllocation(detail, transaction);
    const due = BigInt(summary.balance_due);
    if (due <= 0n) continue;
    const applied = due < remaining ? due : remaining;
    allocations.push({ id: crypto.randomUUID(), settlement_id: settlementId, document_id: id, direction, amount: applied.toString() });
    remaining -= applied;
  }
  return { allocations, remaining };
}
async function createDirect(data, userId) {
  return sequelize.transaction(async (transaction) => {
    const amount = ledger.amount(data.amount, 'مبلغ');
    if (amount <= 0n) throw ErrorApi.badRequest('مبلغ باید بزرگ‌تر از صفر باشد');
    if (data.customerPartnerId === data.supplierPartnerId) throw ErrorApi.badRequest('مشتری و تأمین‌کننده باید دو طرف‌حساب متفاوت باشند');
    const lockedPartners = new Map();
    for (const partnerId of [data.customerPartnerId, data.supplierPartnerId].sort()) {
      lockedPartners.set(partnerId, await CommercialPartner.findByPk(partnerId, { transaction, lock: transaction.LOCK.UPDATE }));
    }
    const customer = lockedPartners.get(data.customerPartnerId);
    const supplier = lockedPartners.get(data.supplierPartnerId);
    if (!customer || Number(customer.is_active) !== 1 || customer.deleted_at || !['CUSTOMER', 'BOTH'].includes(customer.partner_type)) throw ErrorApi.badRequest('مشتری فعال انتخاب‌شده معتبر نیست');
    if (!supplier || Number(supplier.is_active) !== 1 || supplier.deleted_at || !['SUPPLIER', 'BOTH'].includes(supplier.partner_type)) throw ErrorApi.badRequest('تأمین‌کننده فعال انتخاب‌شده معتبر نیست');
    const id = crypto.randomUUID();
    const entryDate = dateOnly(data.entryDate);
    const [customerAlloc, supplierAlloc] = await Promise.all([
      allocateToInvoices(customer.id, 'SALES_INVOICE', amount, transaction, id, 'IN'),
      allocateToInvoices(supplier.id, 'PURCHASE_INVOICE', amount, transaction, id, 'OUT'),
    ]);
    if (customerAlloc.remaining > 0n || supplierAlloc.remaining > 0n) {
      throw ErrorApi.conflict('مبلغ از ماندهٔ قابل تسویهٔ مشتری یا تأمین‌کننده بیشتر است', { customerAvailable: String(amount - customerAlloc.remaining), supplierAvailable: String(amount - supplierAlloc.remaining), requested: String(amount) });
    }
    const customerAccount = await FinancialAccount.findOne({ where: { code: '1100', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    const supplierAccount = await FinancialAccount.findOne({ where: { code: '2000', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!customerAccount || !supplierAccount) throw ErrorApi.internalServerError('حساب‌های دریافتنی یا پرداختنی در دفتر کل فعال نیستند');
    const voucherNo = directVoucherNumber(entryDate);
    const description = data.description.trim();
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'DIRECT_PARTNER_SETTLEMENT', sourceId: id, entryDate, description: `${voucherNo} - ${description}`, createdBy: userId, lines: [
      { accountId: supplierAccount.id, partnerId: supplier.id, debit: amount.toString(), credit: '0' },
      { accountId: customerAccount.id, partnerId: customer.id, debit: '0', credit: amount.toString() },
    ], transaction });
    const settlement = await DirectPartnerSettlement.create({ id, voucher_no: voucherNo, entry_date: entryDate, customer_partner_id: customer.id, supplier_partner_id: supplier.id, amount: amount.toString(), description, reference: data.reference || null, journal_entry_id: journalEntry.id, created_by: userId }, { transaction });
    await DirectPartnerSettlementAllocation.bulkCreate([...customerAlloc.allocations, ...supplierAlloc.allocations], { transaction });
    return { ...plain(settlement), customer: plain(customer), supplier: plain(supplier), allocations: [...customerAlloc.allocations, ...supplierAlloc.allocations], journalEntry: plain(journalEntry) };
  });
}
async function reverseDirect(id, data, userId) {
  return sequelize.transaction(async (transaction) => {
    const original = await DirectPartnerSettlement.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!original || original.reverses_settlement_id) throw ErrorApi.notFound('تسویهٔ مستقیم برای برگشت پیدا نشد');
    if (await DirectPartnerSettlement.findOne({ where: { reverses_settlement_id: original.id }, transaction, lock: transaction.LOCK.UPDATE })) throw ErrorApi.conflict('این تسویه قبلاً برگشت داده شده است');
    const allocations = await DirectPartnerSettlementAllocation.findAll({ where: { settlement_id: original.id }, transaction, lock: transaction.LOCK.UPDATE });
    const id = crypto.randomUUID();
    const entryDate = dateOnly(data.entryDate);
    if (entryDate < String(original.entry_date).slice(0, 10)) throw ErrorApi.badRequest('تاریخ برگشت نمی‌تواند قبل از تاریخ سند اصلی باشد');
    const customerAccount = await FinancialAccount.findOne({ where: { code: '1100', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    const supplierAccount = await FinancialAccount.findOne({ where: { code: '2000', is_active: 1, is_postable: 1 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!customerAccount || !supplierAccount) throw ErrorApi.conflict('حساب‌های دریافتنی و پرداختنی باید فعال باشند');
    const voucherNo = directVoucherNumber(entryDate);
    const description = `برگشت ${original.voucher_no}: ${data.reason.trim()}`;
    const journalEntry = await ledger.createPostedEntry({ sourceType: 'DIRECT_PARTNER_SETTLEMENT_REVERSAL', sourceId: id, entryDate, description: `${voucherNo} - ${description}`, createdBy: userId, lines: [
      { accountId: customerAccount.id, partnerId: original.customer_partner_id, debit: original.amount, credit: '0' },
      { accountId: supplierAccount.id, partnerId: original.supplier_partner_id, debit: '0', credit: original.amount },
    ], transaction });
    const reversal = await DirectPartnerSettlement.create({ id, voucher_no: voucherNo, entry_date: entryDate, customer_partner_id: original.customer_partner_id, supplier_partner_id: original.supplier_partner_id, amount: original.amount, description, reference: original.reference, journal_entry_id: journalEntry.id, reverses_settlement_id: original.id, created_by: userId }, { transaction });
    await DirectPartnerSettlementAllocation.bulkCreate(allocations.map((row) => ({ id: crypto.randomUUID(), settlement_id: id, document_id: row.document_id, direction: row.direction === 'IN' ? 'OUT' : 'IN', amount: row.amount })), { transaction });
    return { ...plain(reversal), originalSettlement: plain(original), journalEntry: plain(journalEntry) };
  });
}
module.exports = { options, listOptions, list, create, reverse, directOptions, listDirect, createDirect, reverseDirect, listCustomerCheques, receiveCustomerCheque, transferCustomerCheque, listCompanyCheckbooks, createCompanyCheckbook, availableCompanyCheckNumbers, listCompanyCheques, listChequeRegister, issueCompanyCheque, clearCompanyCheque, returnCompanyCheque };
