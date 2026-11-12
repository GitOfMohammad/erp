/**
 * @swagger
 * /financial/gl/reports/income-statement:
 *   get:
 *     tags: [Financial]
 *     summary: گزارش درآمد، هزینه و سود/زیان دوره
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: to, required: true, schema: { type: string, format: date } }
 *     responses: { 200: { description: جمع درآمد و هزینه به ریال } }
 * /financial/gl/reports/balance-sheet:
 *   get:
 *     tags: [Financial]
 *     summary: ترازنامه تا تاریخ انتخابی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: asOf, schema: { type: string, format: date } }]
 *     responses: { 200: { description: دارایی، بدهی و حقوق مالکانه همراه کنترل توازن } }
 *//**
 * @swagger
 * /financial/treasury/transfers/{id}/reverse:
 *   post:
 *     tags: [Financial]
 *     summary: برگشت انتقال وجه با ثبت انتقال معکوس
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 201: { description: انتقال معکوس ثبت شد }, 409: { description: موجودی حساب مقصد کافی نیست } }
 * /financial/treasury/accounts/{id}/transactions:
 *   get:
 *     tags: [Financial]
 *     summary: گردش و مانده حساب خزانه
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: ریز گردش به همراه مانده جاری } }
 * /financial/gl/journals/{id}:
 *   get:
 *     tags: [Financial]
 *     summary: جزئیات سند حسابداری
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: سند و ردیف‌های بدهکار/بستانکار } }
 * /financial/gl/journals/{id}/reverse:
 *   post:
 *     tags: [Financial]
 *     summary: برگشت سند دستی با سند معکوس
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 201: { description: سند معکوس ثبت شد } }
 * /financial/gl/accounts/{id}/ledger:
 *   get:
 *     tags: [Financial]
 *     summary: گردش و ماندهٔ یک سرفصل حسابداری
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: گردش حساب و مانده ابتدای بازه } }
 * /commercial/purchasing/invoices/{id}/settlements/{settlementId}/reverse:
 *   post:
 *     tags: [Commercial]
 *     summary: برگشت جبرانی پرداخت فاکتور خرید
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: settlementId, required: true, schema: { type: string, format: uuid } }
 *     responses: { 201: { description: پرداخت جبرانی و سند دفتر کل ثبت شد } }
 *//**
 * @swagger
 * tags:
 *   - name: Financial
 *     description: خزانه‌داری و حسابداری کل
 * /financial/treasury/accounts:
 *   get:
 *     tags: [Financial]
 *     summary: فهرست حساب‌های بانک و صندوق همراه مانده
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: حساب‌های خزانه } }
 *   post:
 *     tags: [Financial]
 *     summary: ایجاد حساب بانک یا صندوق با امکان ثبت مانده افتتاحیه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: حساب خزانه ایجاد شد } }
 * /financial/treasury/balances:
 *   get:
 *     tags: [Financial]
 *     summary: مانده همه حساب‌های فعال خزانه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: مانده حساب‌ها به ریال } }
 * /financial/treasury/transfers:
 *   get:
 *     tags: [Financial]
 *     summary: فهرست انتقال‌های وجه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: انتقال‌ها } }
 *   post:
 *     tags: [Financial]
 *     summary: انتقال اتمیک وجه بین دو حساب خزانه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: انتقال ثبت شد }, 409: { description: مانده کافی نیست } }
 * /financial/gl/accounts:
 *   get:
 *     tags: [Financial]
 *     summary: فهرست سرفصل‌های حسابداری
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: سرفصل‌ها } }
 *   post:
 *     tags: [Financial]
 *     summary: ایجاد سرفصل حسابداری
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: سرفصل ایجاد شد } }
 * /financial/gl/journals:
 *   get:
 *     tags: [Financial]
 *     summary: دفتر روزنامه ثبت‌های قطعی
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: اسناد حسابداری } }
 *   post:
 *     tags: [Financial]
 *     summary: ثبت سند دستی متوازن
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: سند ثبت شد }, 400: { description: سند نامتوازن است } }
 * /financial/gl/reports/trial-balance:
 *   get:
 *     tags: [Financial]
 *     summary: تراز آزمایشی تا تاریخ انتخابی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: asOf, schema: { type: string, format: date } }]
 *     responses: { 200: { description: مانده بدهکار و بستانکار حساب‌ها } }
 */const { Router } = require('express');
const auth = require('../../core/middlewares/authenticate');
const permit = require('../../core/middlewares/authorization');
const validate = require('../../core/middlewares/schemaValidator');
const id = require('../../core/middlewares/idValidator');
const v = require('./financial.validator');
const c = require('./financial.controller');
const cashVouchers = require('./cash-vouchers/cash-vouchers.service');
const ResponseApi = require('../../core/api/ResponseApi');
const r = Router();
r.use(auth);
r.use('/payables', require('./payables/payables.routes'));
r.get('/cash-vouchers/options', permit('financial.cash-vouchers.read'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'گزینه‌ها دریافت شدند', details: await cashVouchers.options() }); } catch (error) { next(error); } });
r.get('/cash-vouchers/options/:kind', permit('financial.cash-vouchers.read'), validate(v.cashVoucherOptionKind, 'params'), validate(v.cashVoucherOptionList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'فهرست گزینه‌ها دریافت شد', details: await cashVouchers.listOptions(req.validated.params.kind, req.validated.query) }); } catch (error) { next(error); } });
r.get('/customer-cheques', permit('financial.cash-vouchers.read'), validate(v.customerChequeList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'چک‌های مشتری دریافت شدند', details: await cashVouchers.listCustomerCheques(req.validated.query) }); } catch (error) { next(error); } });
r.get('/cheque-register', permit('financial.cash-vouchers.read'), validate(v.chequeRegisterList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'دفتر چک دریافت شد', details: await cashVouchers.listChequeRegister(req.validated.query) }); } catch (error) { next(error); } });
r.post('/customer-cheques', permit('financial.cash-vouchers.create'), validate(v.receivedCustomerChequeCreate), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'چک دریافتی ثبت شد', details: await cashVouchers.receiveCustomerCheque(req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.post('/customer-cheques/:id/transfer', permit('financial.cash-vouchers.create'), id(), validate(v.customerChequeTransfer), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'واگذاری چک ثبت شد', details: await cashVouchers.transferCustomerCheque(req.params.id, req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.get('/company-checkbooks', permit('financial.cash-vouchers.read'), validate(v.companyCheckbookList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'دسته‌چک‌ها دریافت شدند', details: await cashVouchers.listCompanyCheckbooks(req.validated.query) }); } catch (error) { next(error); } });
r.post('/company-checkbooks', permit('financial.cash-vouchers.create'), validate(v.companyCheckbookCreate), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'دسته‌چک ثبت شد', details: await cashVouchers.createCompanyCheckbook(req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.get('/company-checkbooks/:id/numbers', permit('financial.cash-vouchers.read'), id(), validate(v.companyCheckNumberList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'شماره‌های آزاد دسته‌چک دریافت شدند', details: await cashVouchers.availableCompanyCheckNumbers(req.params.id, req.validated.query.search) }); } catch (error) { next(error); } });
r.get('/company-cheques', permit('financial.cash-vouchers.read'), validate(v.companyChequeList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'چک‌های پرداختی دریافت شدند', details: await cashVouchers.listCompanyCheques(req.validated.query) }); } catch (error) { next(error); } });
r.post('/company-checkbooks/:id/issue', permit('financial.cash-vouchers.create'), id(), validate(v.companyChequeIssue), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'چک پرداختی صادر شد', details: await cashVouchers.issueCompanyCheque(req.params.id, req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.post('/company-cheques/:id/clear', permit('financial.cash-vouchers.create'), id(), validate(v.companyChequeTransition), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'وصول چک ثبت شد', details: await cashVouchers.clearCompanyCheque(req.params.id, req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.post('/company-cheques/:id/return', permit('financial.cash-vouchers.create'), id(), validate(v.companyChequeTransition), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'برگشت چک ثبت شد', details: await cashVouchers.returnCompanyCheque(req.params.id, req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.get('/cash-vouchers', permit('financial.cash-vouchers.read'), validate(v.cashVoucherList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'فهرست دریافت و پرداخت دریافت شد', details: await cashVouchers.list(req.validated.query) }); } catch (error) { next(error); } });
r.post('/cash-vouchers/receipt', permit('financial.cash-vouchers.create'), validate(v.cashVoucherCreate), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'رسید دریافت وجه ثبت شد', details: await cashVouchers.create('RECEIPT', req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.post('/cash-vouchers/payment', permit('financial.cash-vouchers.create'), validate(v.cashVoucherCreate), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'سند پرداخت وجه ثبت شد', details: await cashVouchers.create('PAYMENT', req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.get('/cash-vouchers/direct-settlements/options/:kind', permit('financial.cash-vouchers.read'), validate(v.directSettlementOptionKind, 'params'), validate(v.directSettlementOptionList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'طرف‌حساب‌های تسویه دریافت شدند', details: await cashVouchers.directOptions(req.validated.params.kind, req.validated.query) }); } catch (error) { next(error); } });
r.get('/cash-vouchers/direct-settlements', permit('financial.cash-vouchers.read'), validate(v.directSettlementList, 'query'), async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'فهرست تسویه‌های مستقیم دریافت شد', details: await cashVouchers.listDirect(req.validated.query) }); } catch (error) { next(error); } });
r.post('/cash-vouchers/direct-settlements', permit('financial.cash-vouchers.create'), validate(v.directPartnerSettlementCreate), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'تسویهٔ مستقیم ثبت شد', details: await cashVouchers.createDirect(req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.post('/cash-vouchers/direct-settlements/:id/reverse', permit('financial.cash-vouchers.reverse'), id(), validate(v.cashVoucherReverse), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'برگشت تسویهٔ مستقیم ثبت شد', details: await cashVouchers.reverseDirect(req.params.id, req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.post('/cash-vouchers/:id/reverse', permit('financial.cash-vouchers.reverse'), id(), validate(v.cashVoucherReverse), async (req, res, next) => { try { return ResponseApi.created(res, { message: 'سند معکوس ثبت شد', details: await cashVouchers.reverse(req.params.id, req.validated.body, req.user.id) }); } catch (error) { next(error); } });
r.get('/treasury/accounts', permit('financial.treasury.read'), validate(v.treasuryList, 'query'), c.listTreasury);
r.post('/treasury/accounts', permit('financial.treasury.manage'), validate(v.createTreasury), c.createTreasury);
r.get('/treasury/accounts/:id', permit('financial.treasury.read'), id(), c.getTreasury);
r.patch('/treasury/accounts/:id', permit('financial.treasury.manage'), id(), validate(v.updateTreasury), c.updateTreasury);
r.get('/treasury/balances', permit('financial.treasury.read'), c.treasuryBalances);
r.get('/treasury/accounts/:id/transactions', permit('financial.treasury.read'), id(), validate(v.transactionList, 'query'), c.treasuryTransactions);
r.get('/treasury/transfers', permit('financial.treasury.read'), validate(v.transferList, 'query'), c.listTransfers);
r.post('/treasury/transfers', permit('financial.treasury.transfer'), validate(v.transfer), c.createTransfer);
r.post('/treasury/transfers/:id/reverse', permit('financial.treasury.transfer'), id(), validate(v.reverseTransfer), c.reverseTransfer);
r.get('/gl/accounts', permit('financial.gl.read'), validate(v.accountList, 'query'), c.listAccounts);
r.post('/gl/accounts', permit('financial.gl.accounts.manage'), validate(v.createAccount), c.createAccount);
r.patch('/gl/accounts/:id', permit('financial.gl.accounts.manage'), id(), validate(v.updateAccount), c.updateAccount);
r.delete('/gl/accounts/:id', permit('financial.gl.accounts.manage'), id(), c.deleteAccount);
r.get('/gl/journals', permit('financial.gl.read'), validate(v.journalList, 'query'), c.listJournals);
r.get('/gl/journals/:id', permit('financial.gl.read'), id(), c.getJournal);
r.post('/gl/journals', permit('financial.gl.journals.create'), validate(v.createJournal), c.createJournal);
r.post('/gl/journals/:id/reverse', permit('financial.gl.journals.reverse'), id(), validate(v.reverseJournal), c.reverseJournal);
r.get('/gl/reports/trial-balance', permit('financial.reports.read'), validate(v.reportDate, 'query'), c.trialBalance);
r.get('/gl/reports/income-statement', permit('financial.reports.read'), validate(v.statementPeriod, 'query'), c.incomeStatement);
r.get('/gl/reports/balance-sheet', permit('financial.reports.read'), validate(v.reportDate, 'query'), c.balanceSheet);
r.get('/gl/accounts/:id/ledger', permit('financial.reports.read'), id(), validate(v.transactionList, 'query'), c.accountLedger);
r.get('/gl/fiscal-years', permit('financial.fiscal-years.close'), c.listFiscalYears);
r.post('/gl/fiscal-years/preview-close', permit('financial.fiscal-years.close'), validate(v.fiscalClose), c.previewFiscalClose);
r.post('/gl/fiscal-years/close', permit('financial.fiscal-years.close'), validate(v.fiscalClose), c.closeFiscalYear);
r.get('/bank-reconciliations', permit('financial.treasury.read'), validate(v.reconciliationList, 'query'), c.listReconciliations);
r.post('/bank-reconciliations', permit('financial.reconciliation.manage'), validate(v.reconciliationCreate), c.createReconciliation);
r.get('/bank-reconciliations/:id/candidates', permit('financial.treasury.read'), id(), validate(v.reconciliationCandidateList, 'query'), c.reconciliationCandidates);
r.get('/bank-reconciliations/:id/lines', permit('financial.treasury.read'), id(), validate(v.reconciliationLineList, 'query'), c.listReconciliationLines);
r.get('/bank-reconciliations/:id', permit('financial.treasury.read'), id(), c.getReconciliation);
r.post('/bank-reconciliations/:id/lines', permit('financial.reconciliation.manage'), id(), validate(v.reconciliationLine), c.addReconciliationLine);
r.patch('/bank-reconciliations/:id/lines/:lineId', permit('financial.reconciliation.manage'), id(), id('lineId'), validate(v.reconciliationLine), c.updateReconciliationLine);
r.delete('/bank-reconciliations/:id/lines/:lineId', permit('financial.reconciliation.manage'), id(), id('lineId'), c.deleteReconciliationLine);
r.put('/bank-reconciliations/:id/lines/:lineId/match', permit('financial.reconciliation.manage'), id(), validate(v.reconciliationMatch), c.matchReconciliationLine);
r.post('/bank-reconciliations/:id/finalize', permit('financial.reconciliation.manage'), id(), c.finalizeReconciliation);
module.exports = r;








