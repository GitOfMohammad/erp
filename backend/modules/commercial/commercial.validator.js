const Joi = require('joi');

const id = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });
const item = Joi.object({
  productId: id.required(),
  quantity: Joi.number().positive().precision(3).max(999999999999.999).required(),
  unitPrice: Joi.number().integer().min(0).max(9007199254740991).required(),
});
const lines = Joi.array().min(1).max(100).unique((a, b) => a.productId === b.productId);
const currencyFields = {
  currency: Joi.string().valid('IRR', 'USD', 'EUR', 'AED').default('IRR'),
  exchangeRate: Joi.when('currency', {
    is: 'IRR', then: Joi.string().valid('1').default('1'),
    otherwise: Joi.string().pattern(/^[1-9][0-9]{0,17}$/).required(),
  }),
  dueDate: Joi.date().iso().allow(null),
};
const currencyUpdateFields = {
  currency: Joi.string().valid('IRR', 'USD', 'EUR', 'AED'),
  exchangeRate: Joi.string().pattern(/^[1-9][0-9]{0,17}$/),
  dueDate: Joi.date().iso().allow(null),
};

const purchaseItem = (withTax = false) => Joi.object({
  productId: id.required(),
  quantity: Joi.number().positive().precision(3).max(999999999999.999).required(),
  unitPrice: Joi.number().integer().min(0).max(9007199254740991).required(),
  discountPercent: Joi.number().min(0).max(100).precision(4).default(0),
  discountAmount: Joi.number().integer().min(0).max(9007199254740991).default(0),
  ...(withTax ? { taxPercent: Joi.number().min(0).max(100).precision(4).default(0) } : {}),
});

const createDocumentSchema = (type) => Joi.object({
  ...currencyFields,
  partnerId: type === 'PURCHASE_RETURN' || type === 'SALES_RETURN' || !type.endsWith('RETURN') ? id.required() : Joi.forbidden(),
  warehouseId: type.endsWith('INVOICE') || type.endsWith('RETURN') ? id.required() : Joi.forbidden(),
  orderId: type.endsWith('INVOICE') ? id.optional() : Joi.forbidden(),
  ...(type === 'SALES_INVOICE' ? { salesRepresentativeId: id.allow(null) } : {}),
  relatedDocumentId: Joi.forbidden(),
  items: type.startsWith('PURCHASE') || type === 'SALES_ORDER'
    ? lines.items(purchaseItem(type === 'PURCHASE_INVOICE' || type === 'PURCHASE_RETURN')).required()
    : type === 'SALES_INVOICE' || type === 'SALES_RETURN'
      ? lines.items(purchaseItem(true)).required()
      : lines.items(item).required(),
  ...(type === 'PURCHASE_INVOICE' || type === 'PURCHASE_RETURN' || type === 'SALES_INVOICE' || type === 'SALES_RETURN' ? {
    discountPercent: Joi.number().min(0).max(100).precision(4).default(0),
    discountAmount: Joi.number().integer().min(0).max(9007199254740991).default(0),
    freightAmount: Joi.number().integer().min(0).max(9007199254740991).default(0),
    roundingUnit: Joi.number().integer().valid(1, 10, 100, 1000, 10000).default(1),
    roundingMethod: Joi.string().valid('NEAREST', 'UP', 'DOWN').default('NEAREST'),
  } : {}),
  note: Joi.string().trim().allow('', null).default(null),
}).required();

const decisionSchema = Joi.object({
  decision: Joi.string().valid('APPROVE', 'REJECT').required(),
  rejectionReason: Joi.when('decision', {
    is: 'REJECT',
    then: Joi.string().trim().min(1).max(2000).required(),
    otherwise: Joi.forbidden(),
  }),
}).required();

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'),
  search: Joi.string().trim().max(100).allow('').default(''),
}).required();

const updateOrderSchema = (type) => Joi.object({
  ...currencyUpdateFields,
  partnerId: id,
  items: lines.items(type === 'PURCHASE_ORDER' || type === 'SALES_ORDER' ? purchaseItem(false) : item),
  note: Joi.string().trim().allow('', null),
}).min(1).required();
const updatePurchaseInvoiceSchema = Joi.object({
  ...currencyUpdateFields,
  partnerId: id.required(),
  warehouseId: id.required(),
  orderId: id.optional(),
  items: lines.items(purchaseItem(true)).required(),
  discountPercent: Joi.number().min(0).max(100).precision(4).default(0),
  discountAmount: Joi.number().integer().min(0).max(9007199254740991).default(0),
  freightAmount: Joi.number().integer().min(0).max(9007199254740991).default(0),
  roundingUnit: Joi.number().integer().valid(1, 10, 100, 1000, 10000).default(1),
  roundingMethod: Joi.string().valid('NEAREST', 'UP', 'DOWN').default('NEAREST'),
  note: Joi.string().trim().allow('', null).default(null),
}).required();
const updatePurchaseReturnSchema = createDocumentSchema('PURCHASE_RETURN');
const updateSalesInvoiceSchema = createDocumentSchema('SALES_INVOICE');
const updateSalesReturnSchema = createDocumentSchema('SALES_RETURN');
const cancelOrderSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(2000).required(),
}).required();
const settlementSchema = Joi.object({
  action: Joi.string().valid('SETTLE', 'REFUND').required(),
  treasuryAccountId: id.required(),
  amount: Joi.string().pattern(/^[1-9][0-9]{0,17}$/).required(),
  method: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER').required(),
  reference: Joi.string().trim().max(100).allow('', null),
  paidAt: Joi.date().iso(),
  note: Joi.string().trim().allow('', null),
}).required();
const reverseSettlementSchema = Joi.object({ reason: Joi.string().trim().min(2).max(500).required(), reference: Joi.string().trim().max(100).allow('', null), paidAt: Joi.date().iso() }).required();
const balanceSchema = Joi.object({
  direction: Joi.string().valid('PAYABLE', 'RECEIVABLE').required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).required();
const returnProductsSchema = Joi.object({
  partnerId: id.required(),
  search: Joi.string().trim().max(100).allow('').default(''),
  excludeReturnId: id,
}).required();
const salesRepresentativeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  phone: Joi.string().trim().max(30).allow('', null).default(null),
  email: Joi.string().email().max(254).allow('', null).default(null),
  is_active: Joi.number().integer().valid(0, 1).default(1),
}).required();
const salesRepresentativeUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  phone: Joi.string().trim().max(30).allow('', null),
  email: Joi.string().email().max(254).allow('', null),
  is_active: Joi.number().integer().valid(0, 1),
}).min(1).required();
const salesRepresentativeListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow('').default(''),
  status: Joi.string().valid('ACTIVE', 'INACTIVE'),
}).required();

module.exports = {
  createDocumentSchema,
  decisionSchema,
  listSchema,
  updateOrderSchema,
  updatePurchaseInvoiceSchema,
  updatePurchaseReturnSchema,
  updateSalesInvoiceSchema,
  updateSalesReturnSchema,
  cancelOrderSchema,
  settlementSchema,
  reverseSettlementSchema,
  balanceSchema,
  returnProductsSchema,
  salesRepresentativeSchema,
  salesRepresentativeUpdateSchema,
  salesRepresentativeListSchema,
};


