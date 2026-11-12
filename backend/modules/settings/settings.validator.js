const Joi = require('joi')

const text = max => Joi.string().trim().max(max).allow('', null).empty('').default(null)
const row = shape => Joi.object(shape).unknown(false)

const companyGeneralSchema = Joi.object({
  displayName: text(200), legalName: text(250), tradeName: text(200), legalForm: text(100),
  nationalId: text(32), economicNumber: text(32), registrationNumber: text(32),
  phoneNumbers: Joi.array().items(row({ label: text(80), number: text(40), extension: text(12) })).max(20).default([]),
  mobileNumbers: Joi.array().items(row({ label: text(80), number: text(40) })).max(20).default([]),
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(254).allow('', null).empty('').default(null),
  departmentEmails: Joi.array().items(row({ label: text(80), email: Joi.string().trim().email({ tlds: { allow: false } }).max(254).allow('', null).empty('').default(null) })).max(20).default([]),
  website: text(500),
  socialAccounts: Joi.array().items(row({ platform: text(80), label: text(100), handle: text(200), url: text(500) })).max(30).default([]),
  addresses: Joi.array().items(row({ label: text(100), province: text(100), city: text(100), address: text(1000), postalCode: text(20), mapUrl: text(500), latitude: Joi.number().min(-90).max(90).allow(null).empty('').default(null), longitude: Joi.number().min(-180).max(180).allow(null).empty('').default(null) })).max(20).default([]),
  signatoryName: text(200), signatoryTitle: text(150),
}).required()

const taxSettingsSchema = Joi.object({
  taxpayerStatus: Joi.string().valid('unset', 'taxable', 'exempt').default('unset'),
  priceIncludesVat: Joi.boolean().default(false),
  roundingMethod: Joi.string().valid('line', 'document').default('document'),
  vatRate: Joi.number().precision(2).min(0).max(100).allow(null).default(null),
}).required()

const moadianSettingsSchema = Joi.object({
  environment: Joi.string().valid('sandbox', 'production').default('sandbox'),
  deliveryMode: Joi.string().valid('direct', 'intermediary').default('direct'),
  fiscalMemoryId: text(64),
  intermediaryName: text(160),
}).custom((values, helpers) => {
  if (values.deliveryMode === 'intermediary' && !values.intermediaryName) return helpers.error('any.invalid')
  if (values.deliveryMode === 'direct' && values.intermediaryName) return helpers.error('any.invalid')
  return values
}).messages({ 'any.invalid': 'نام شرکت معتمد فقط در روش ارسال از طریق واسط لازم است' }).required()

const financeSettingsSchema = Joi.object({
  fiscalStart: Joi.date().iso().allow(null).default(null),
  fiscalEnd: Joi.date().iso().allow(null).default(null),
  baseCurrency: Joi.string().valid('IRR').default('IRR'),
  enabledCurrencies: Joi.array().items(Joi.string().valid('USD', 'EUR', 'AED')).unique().max(3).default(['USD', 'EUR', 'AED']),
  exchangeRateMode: Joi.string().valid('manual').default('manual'),
  settlementCurrency: Joi.string().valid('IRR').default('IRR'),
  displayUnit: Joi.string().valid('rial', 'toman').default('rial'),
  allowClosedPeriodPosting: Joi.boolean().default(false),
  autoCreateDraftJournal: Joi.boolean().default(true),
}).custom((values, helpers) => {
  if (values.fiscalStart && values.fiscalEnd && values.fiscalEnd < values.fiscalStart) {
    return helpers.error('any.invalid')
  }
  return values
}).messages({ 'any.invalid': 'پایان دورهٔ مالی باید پس از شروع آن باشد' }).required()

const inventorySettingsSchema = Joi.object({
  purchaseWarehouseId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null).default(null),
  salesWarehouseId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null).default(null),
  productionWarehouseId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null).default(null),
  requireCountApproval: Joi.boolean().default(true),
  inventoryAccountId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null).default(null),
  stockGainAccountId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null).default(null),
  stockLossAccountId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null).default(null),
}).required()

const securitySettingsSchema = Joi.object({
  minimumPasswordLength: Joi.number().integer().valid(8, 10, 12, 14).default(8),
  requireNumber: Joi.boolean().default(false),
  requireSymbol: Joi.boolean().default(false),
  sessionDurationHours: Joi.number().integer().valid(8, 24, 72, 168).default(168),
  recordSecurityEvents: Joi.boolean().default(true),
  eventRetentionDays: Joi.number().integer().valid(30, 90, 180).default(90),
}).required()

const printSettingsSchema = Joi.object({
  printOptions: Joi.object({ paper: Joi.string().valid('A4', 'A5', 'thermal').required(), orientation: Joi.string().valid('portrait', 'landscape').required(), margins: Joi.string().valid('normal', 'compact', 'wide').required(), openDialog: Joi.boolean().default(true) }).required(),
  templates: Joi.array().max(50).items(Joi.object({ id: Joi.string().trim().min(1).max(80).required(), name: Joi.string().trim().min(1).max(120).required(), size: Joi.string().valid('A4', 'A5', '۸۰ میلی‌متر', 'thermal').required(), orientation: Joi.string().valid('portrait', 'landscape').required(), description: Joi.string().allow('').max(500).default(''), tags: Joi.array().items(Joi.string().trim().max(60)).max(20).default([]), logo: Joi.boolean().default(false), stamp: Joi.boolean().default(false), elements: Joi.array().max(100).items(Joi.object().unknown(true)).default([]), background: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow(null).default(null) }).unknown(false)).required(),
  defaults: Joi.object().pattern(Joi.string().max(80), Joi.string().max(80)).max(30).required(),
}).required()

module.exports = { companyGeneralSchema, taxSettingsSchema, moadianSettingsSchema, financeSettingsSchema, inventorySettingsSchema, securitySettingsSchema, printSettingsSchema }
