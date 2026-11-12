/**
 * @swagger
 * /commercial/sales/invoices/{id}/settlements/{settlementId}/reverse:
 *   post:
 *     tags: [Commercial]
 *     summary: برگشت جبرانی دریافت فاکتور فروش
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: settlementId, required: true, schema: { type: string, format: uuid } }
 *     responses: { 201: { description: دریافت جبرانی و سند دفتر کل ثبت شد } }
 *//**
 * @swagger
 * /commercial/purchasing/invoices/{id}/settlements:
 *   post:
 *     tags: [Commercial]
 *     summary: پرداخت یا بازپرداخت فاکتور خرید از حساب خزانه
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, treasuryAccountId, amount, method]
 *             properties:
 *               action: { type: string, enum: [SETTLE, REFUND] }
 *               treasuryAccountId: { type: string, format: uuid }
 *               amount: { type: string, pattern: '^[1-9][0-9]{0,17}$' }
 *               method: { type: string, enum: [CASH, BANK_TRANSFER, CHEQUE, OTHER] }
 *     responses: { 201: { description: تسویه در دفتر کل ثبت شد }, 409: { description: مانده یا موجودی کافی نیست } }
 * /commercial/sales/invoices/{id}/settlements:
 *   post:
 *     tags: [Commercial]
 *     summary: دریافت یا بازپرداخت فاکتور فروش از حساب خزانه
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 201: { description: تسویه در دفتر کل ثبت شد }, 409: { description: مانده یا موجودی کافی نیست } }
 *//**
 * @swagger
 * /commercial/financial-balances:
 *   get:
 *     summary: ماندهٔ بدهی تأمین‌کنندگان یا طلب مشتریان
 *     tags: [Commercial]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: direction
 *         required: true
 *         schema: { type: string, enum: [PAYABLE, RECEIVABLE] }
 *     responses: { 200: { description: جمع ماندهٔ فاکتورهای تأییدشده پس از برگشت و تسویه } }
 */
const {Router}=require('express');const auth=require('../../core/middlewares/authenticate');const permit=require('../../core/middlewares/authorization');const validate=require('../../core/middlewares/schemaValidator');const id=require('../../core/middlewares/idValidator');const s=require('./commercial.validator');const c=require('./commercial.controller');const service=require('./commercial.service');const r=Router();r.use(auth);r.use('/partners',require('./partners/partners.routes'));r.get('/financial-balances',permit('commercial.finance.read'),validate(s.balanceSchema,'query'),c.financialBalances);r.get('/purchasing/settlement-accounts',permit('purchasing.invoices.settle'),c.settlementAccounts);r.get('/sales/settlement-accounts',permit('sales.invoices.settle'),c.settlementAccounts);r.get('/purchasing/returns/products',permit('purchasing.returns.create'),validate(s.returnProductsSchema,'query'),c.returnProducts);r.get('/sales/returns/products',permit('sales.returns.create'),validate(s.returnProductsSchema,'query'),c.returnSalesProducts);r.route('/sales-representatives').get(permit('sales.representatives.read'),validate(s.salesRepresentativeListSchema,'query'),c.salesRepresentatives.list).post(permit('sales.representatives.manage'),validate(s.salesRepresentativeSchema),c.salesRepresentatives.create);r.patch('/sales-representatives/:id',permit('sales.representatives.manage'),id(),validate(s.salesRepresentativeUpdateSchema),c.salesRepresentatives.update);const paths={PURCHASE_ORDER:'/purchasing/orders',PURCHASE_INVOICE:'/purchasing/invoices',PURCHASE_RETURN:'/purchasing/returns',SALES_ORDER:'/sales/orders',SALES_INVOICE:'/sales/invoices',SALES_RETURN:'/sales/returns'};for(const [type,path] of Object.entries(paths)){const base=service.TYPES[type].permission;r.route(path).get(permit(base+'.read'),validate(s.listSchema,'query'),c[type].list).post(permit(base+'.create'),validate(s.createDocumentSchema(type)),c[type].create);r.get(path+'/:id',permit(base+'.read'),id(),c[type].get);if(type.endsWith('ORDER')){r.patch(path+'/:id',permit(base+'.update'),id(),validate(s.updateOrderSchema(type)),c[type].update);r.post(path+'/:id/cancel',permit(base+'.cancel'),id(),validate(s.cancelOrderSchema),c[type].cancel);}else{if(type==='PURCHASE_INVOICE')r.patch(path+'/:id',permit(base+'.update'),id(),validate(s.updatePurchaseInvoiceSchema),c[type].update);if(type==='PURCHASE_RETURN')r.patch(path+'/:id',permit('purchasing.returns.update'),id(),validate(s.updatePurchaseReturnSchema),c[type].update);if(type==='SALES_INVOICE')r.patch(path+'/:id',permit('sales.invoices.update'),id(),validate(s.updateSalesInvoiceSchema),c[type].update);if(type==='SALES_RETURN')r.patch(path+'/:id',permit('sales.returns.update'),id(),validate(s.updateSalesReturnSchema),c[type].update);r.post(path+'/:id/decision',permit(base+'.approve'),id(),validate(s.decisionSchema),c[type].decision);if(type.endsWith('INVOICE')){r.post(path+'/:id/settlements',permit(base+'.settle'),id(),validate(s.settlementSchema),c[type].settle);r.post(path+'/:id/settlements/:settlementId/reverse',permit(base+'.settle'),id(),validate(s.reverseSettlementSchema),c[type].reverseSettlement);}}}module.exports=r;


