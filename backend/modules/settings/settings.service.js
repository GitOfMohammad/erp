const fs = require('node:fs/promises')
const path = require('node:path')
const { CompanySetting, TaxSetting, FinanceSetting, PrintSetting, MoadianSetting } = require('../../core/database/models')
const ErrorApi = require('../../core/api/ErrorApi')
const env = require('../../core/config/env')

const emptyGeneral = () => ({ id: 1, displayName: null, legalName: null, tradeName: null, legalForm: null, nationalId: null, economicNumber: null, registrationNumber: null, phoneNumbers: [], mobileNumbers: [], email: null, departmentEmails: [], website: null, socialAccounts: [], addresses: [], signatoryName: null, signatoryTitle: null, logoPath: null, stampPath: null })
const plain = row => row?.get ? row.get({ plain: true }) : row
const jsonValue = (value, fallback) => {
  let parsed = value
  for (let attempt = 0; attempt < 5 && typeof parsed === 'string'; attempt += 1) {
    try { parsed = JSON.parse(parsed) } catch { return fallback }
  }
  return parsed && typeof parsed === 'object' ? parsed : fallback
}
const present = row => {
  const values = row ? plain(row) : emptyGeneral()
  for (const field of ['phoneNumbers', 'mobileNumbers', 'departmentEmails', 'socialAccounts', 'addresses']) values[field] = jsonValue(values[field], [])
  if (values.logoPath) values.logoPath = '/settings/general/media/logo'
  if (values.stampPath) values.stampPath = '/settings/general/media/stamp'
  return values
}
const getGeneral = async () => present(await CompanySetting.findByPk(1))

function currentTaxYear() {
  const yearPart = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', timeZone: 'Asia/Tehran' })
    .formatToParts(new Date())
    .find(part => part.type === 'year')
  return Number(yearPart.value)
}

const emptyTaxSettings = taxYear => ({ taxYear, taxpayerStatus: 'unset', priceIncludesVat: false, roundingMethod: 'document', vatRate: null })
const presentTaxSettings = row => ({
  taxYear: Number(row.taxYear),
  taxpayerStatus: row.taxpayerStatus,
  priceIncludesVat: Boolean(row.priceIncludesVat),
  roundingMethod: row.roundingMethod,
  vatRate: row.vatRate == null ? null : Number(row.vatRate),
})

async function getTaxSettings() {
  const taxYear = currentTaxYear()
  const row = await TaxSetting.findByPk(taxYear)
  return row ? presentTaxSettings(row) : emptyTaxSettings(taxYear)
}

async function saveTaxSettings(values) {
  const taxYear = currentTaxYear()
  await TaxSetting.upsert({ taxYear, ...values })
  return getTaxSettings()
}

const emptyMoadianSettings = () => ({ id: 1, environment: 'sandbox', deliveryMode: 'direct', fiscalMemoryId: null, intermediaryName: null })
async function getMoadianSettings() {
  const row = await MoadianSetting.findByPk(1)
  return row ? { ...emptyMoadianSettings(), ...plain(row) } : emptyMoadianSettings()
}
async function saveMoadianSettings(values) {
  await MoadianSetting.upsert({ id: 1, ...values })
  return getMoadianSettings()
}

const emptyFinanceSettings = () => ({
  id: 1,
  fiscalStart: null,
  fiscalEnd: null,
  baseCurrency: 'IRR',
  enabledCurrencies: ['USD', 'EUR', 'AED'],
  exchangeRateMode: 'manual',
  settlementCurrency: 'IRR',
  displayUnit: 'rial',
  allowClosedPeriodPosting: false,
  autoCreateDraftJournal: true,
})
const presentFinanceSettings = row => {
  if (!row) return emptyFinanceSettings()
  const values = plain(row)
  const enabledCurrencies = jsonValue(values.enabledCurrencies, ['USD', 'EUR', 'AED'])
  return {
    ...emptyFinanceSettings(),
    ...values,
    enabledCurrencies: Array.isArray(enabledCurrencies) ? enabledCurrencies : ['USD', 'EUR', 'AED'],
    allowClosedPeriodPosting: Boolean(values.allowClosedPeriodPosting),
    autoCreateDraftJournal: Boolean(values.autoCreateDraftJournal),
  }
}

async function getFinanceSettings() {
  return presentFinanceSettings(await FinanceSetting.findByPk(1))
}

async function getEnabledFinanceCurrencies() {
  const settings = await getFinanceSettings()
  return ['IRR', ...settings.enabledCurrencies]
}

async function saveFinanceSettings(values) {
  await FinanceSetting.upsert({ id: 1, ...values })
  return getFinanceSettings()
}

async function getInventorySettings() {
  const { InventorySetting, Warehouse, FinancialAccount } = require('../../core/database/models')
  const [row, warehouses, accounts] = await Promise.all([
    InventorySetting.findByPk(1),
    Warehouse.findAll({ where: { is_active: 1 }, attributes: ['id', 'code', 'name'], order: [['name', 'ASC']] }),
    FinancialAccount.findAll({ where: { is_active: 1, is_postable: 1 }, attributes: ['id', 'code', 'name', 'account_type'], order: [['code', 'ASC']] }),
  ])
  return {
    settings: row ? row.get({ plain: true }) : { purchaseWarehouseId: null, salesWarehouseId: null, productionWarehouseId: null, requireCountApproval: true, inventoryAccountId: null, stockGainAccountId: null, stockLossAccountId: null },
    warehouses: warehouses.map(item => item.get({ plain: true })),
    accounts: accounts.map(item => item.get({ plain: true })),
  }
}
async function getInventoryDefaults() {
  const { InventorySetting, Warehouse } = require('../../core/database/models')
  const row = await InventorySetting.findByPk(1)
  const values = { purchaseWarehouseId: row?.purchaseWarehouseId || null, salesWarehouseId: row?.salesWarehouseId || null, productionWarehouseId: row?.productionWarehouseId || null }
  for (const field of Object.keys(values)) {
    if (!values[field]) continue
    const warehouse = await Warehouse.findByPk(values[field], { attributes: ['id', 'is_active'] })
    if (!warehouse || Number(warehouse.is_active) !== 1) values[field] = null
  }
  return values
}

async function saveInventorySettings(values) {
  const { InventorySetting, Warehouse, FinancialAccount } = require('../../core/database/models')
  const checks = [
    ['purchaseWarehouseId', Warehouse, 'انبار پیش‌فرض دریافت خرید'],
    ['salesWarehouseId', Warehouse, 'انبار پیش‌فرض ارسال فروش'],
    ['productionWarehouseId', Warehouse, 'انبار پیش‌فرض تولید'],
    ['inventoryAccountId', FinancialAccount, 'حساب موجودی کالا'],
    ['stockGainAccountId', FinancialAccount, 'حساب اضافات انبار'],
    ['stockLossAccountId', FinancialAccount, 'حساب کسری انبار'],
  ]
  for (const [field, Model, label] of checks) {
    const id = values[field]
    if (!id) continue
    const row = await Model.findByPk(id)
    if (!row || Number(row.is_active) !== 1 || (Model === FinancialAccount && Number(row.is_postable) !== 1)) throw ErrorApi.badRequest(`${label} انتخاب‌شده معتبر یا فعال نیست`)
    const validTypes = field === 'inventoryAccountId' ? ['ASSET'] : field === 'stockGainAccountId' ? ['REVENUE', 'EXPENSE'] : ['EXPENSE']
    if (Model === FinancialAccount && !validTypes.includes(row.account_type)) throw ErrorApi.badRequest(`${label} باید از گروه حساب مناسب انتخاب شود`)
  }
  await InventorySetting.upsert({ id: 1, ...values })
  return getInventorySettings()
}

async function saveGeneral(values) {
  const current = await CompanySetting.findByPk(1)
  if (current) await current.update(values)
  else await CompanySetting.create({ ...emptyGeneral(), ...values })
  return getGeneral()
}

function storedImagePath(filename) { return `private-images/company/${path.basename(filename)}` }
function diskPathForStoredImage(filePath) {
  if (typeof filePath !== 'string' || !filePath.startsWith('private-images/company/')) return null
  const directory = path.resolve(env.uploads.directory, 'private-images', 'company')
  const candidate = path.resolve(directory, path.basename(filePath))
  const relative = path.relative(directory, candidate)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? candidate : null
}
async function removeStoredImage(filePath) {
  const target = diskPathForStoredImage(filePath)
  if (target) await fs.unlink(target).catch(error => { if (error.code !== 'ENOENT') throw error })
}

async function setMedia(kind, filename) {
  const field = kind === 'logo' ? 'logoPath' : 'stampPath'
  const current = await CompanySetting.findByPk(1)
  const oldPath = current?.[field] || null
  if (current) await current.update({ [field]: storedImagePath(filename) })
  else await CompanySetting.create({ ...emptyGeneral(), [field]: storedImagePath(filename) })
  await removeStoredImage(oldPath)
  return getGeneral()
}

async function clearMedia(kind) {
  const field = kind === 'logo' ? 'logoPath' : 'stampPath'
  const current = await CompanySetting.findByPk(1)
  if (!current) return getGeneral()
  const oldPath = current[field]
  await current.update({ [field]: null })
  await removeStoredImage(oldPath)
  return getGeneral()
}

async function getMediaPath(kind) {
  const field = kind === 'logo' ? 'logoPath' : 'stampPath'
  const row = await CompanySetting.findByPk(1)
  const filePath = row?.[field]
  const target = diskPathForStoredImage(filePath)
  if (!target) return null
  try { await fs.access(target); return target } catch { return null }
}

const defaultPrintElements = (title, withLogo = true, withStamp = false) => [
  ...(withLogo ? [{ id: 'logo', type: 'logo', label: 'لوگوی شرکت', value: 'لوگوی شرکت', x: 76, y: 4, w: 17, h: 10, fontSize: 10, align: 'center', color: '#64748b' }] : []),
  { id: 'company', type: 'company', label: 'مشخصات شرکت', value: '', x: 8, y: 4, w: 58, h: 10, fontSize: 11, align: 'right', color: '#27364a', bold: true },
  { id: 'title', type: 'title', label: 'عنوان سند', value: title, x: 30, y: 17, w: 40, h: 6, fontSize: 17, align: 'center', color: '#172033', bold: true },
  { id: 'number', type: 'field', label: 'شمارهٔ سند', value: '', binding: 'invoice.number', x: 7, y: 26, w: 25, h: 4, fontSize: 10, align: 'right', color: '#344054' },
  { id: 'date', type: 'field', label: 'تاریخ سند', value: '', binding: 'invoice.date', x: 35, y: 26, w: 25, h: 4, fontSize: 10, align: 'right', color: '#344054' },
  { id: 'partner', type: 'field', label: 'نام طرف حساب', value: '', binding: 'partner.name', x: 63, y: 26, w: 30, h: 4, fontSize: 10, align: 'right', color: '#344054' },
  { id: 'divider', type: 'divider', label: 'خط جداکننده', value: '', x: 7, y: 37, w: 86, h: 1, borderWidth: 1, borderColor: '#d7dee7' },
  { id: 'table', type: 'table', label: 'جدول اقلام', value: '', x: 7, y: 40, w: 86, h: 28, fontSize: 9, align: 'right', color: '#344054', borderColor: '#cbd5e1' },
  { id: 'totals', type: 'totals', label: 'جمع و مالیات', value: '', x: 47, y: 71, w: 46, h: 11, fontSize: 10, align: 'right', color: '#27364a', bold: true },
  ...(withStamp ? [{ id: 'stamp', type: 'stamp', label: 'مهر شرکت', value: 'مهر شرکت', x: 8, y: 78, w: 18, h: 14, fontSize: 9, align: 'center', color: '#728096' }] : []),
  { id: 'signature', type: 'signature', label: 'محل امضا', value: 'امضای خریدار', x: 71, y: 85, w: 22, h: 6, fontSize: 9, align: 'center', color: '#728096' },
]
const defaultPrintTemplates = () => [
  { id: 'official', name: 'فاکتور رسمی', size: 'A4', orientation: 'portrait', description: 'مناسب چاپ فاکتور با اطلاعات شرکت و طرف حساب', tags: ['فروش', 'خرید'], logo: true, stamp: true, elements: defaultPrintElements('فاکتور فروش', true, true) },
  { id: 'simple', name: 'فاکتور ساده', size: 'A4', orientation: 'portrait', description: 'چیدمان خلوت برای چاپ روزمره', tags: ['فروش', 'پیش‌فاکتور'], logo: true, stamp: false, elements: defaultPrintElements('فاکتور فروش') },
  { id: 'thermal', name: 'فاکتور حرارتی', size: '۸۰ میلی‌متر', orientation: 'portrait', description: 'نسخهٔ فشرده برای چاپگرهای رسید حرارتی', tags: ['فروش'], logo: false, stamp: false, elements: defaultPrintElements('رسید فروش', false) },
]
const emptyPrintSettings = () => ({ id: 1, printOptions: { paper: 'A4', orientation: 'portrait', margins: 'normal', openDialog: true }, templates: defaultPrintTemplates(), defaults: { فروش: 'official', خرید: 'official', پیش‌فاکتور: 'simple' } })
async function getPrintSettings() {
  const row = await PrintSetting.findByPk(1)
  if (!row) return emptyPrintSettings()
  const stored = plain(row)
  const defaults = emptyPrintSettings()
  const printOptions = jsonValue(stored.printOptions, defaults.printOptions)
  const templates = jsonValue(stored.templates, defaults.templates)
  const documentDefaults = jsonValue(stored.defaults, defaults.defaults)
  return {
    ...defaults,
    ...stored,
    printOptions: printOptions && typeof printOptions === 'object' && !Array.isArray(printOptions) ? printOptions : defaults.printOptions,
    templates: Array.isArray(templates) && templates.length ? templates : defaults.templates,
    defaults: documentDefaults && typeof documentDefaults === 'object' && !Array.isArray(documentDefaults) && Object.keys(documentDefaults).length ? documentDefaults : defaults.defaults,
  }
}
async function savePrintSettings(values) {
  await PrintSetting.upsert({ id: 1, ...values })
  return getPrintSettings()
}
async function getDefaultPrintTemplate(type) {
  const allowed = ['فروش', 'خرید', 'پیش‌فاکتور']
  if (!allowed.includes(type)) throw ErrorApi.badRequest('نوع قالب چاپ معتبر نیست')
  const settings = await getPrintSettings()
  const id = settings.defaults?.[type]
  return { template: settings.templates.find(item => item.id === id) || null, printOptions: settings.printOptions }
}

module.exports = { getGeneral, saveGeneral, getTaxSettings, saveTaxSettings, getMoadianSettings, saveMoadianSettings, getFinanceSettings, getEnabledFinanceCurrencies, saveFinanceSettings, getInventorySettings, getInventoryDefaults, saveInventorySettings, getPrintSettings, savePrintSettings, getDefaultPrintTemplate, setMedia, clearMedia, getMediaPath, storedImagePath, currentTaxYear }
