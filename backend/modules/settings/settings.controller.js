const fs = require('node:fs/promises')
const path = require('node:path')
const ResponseApi = require('../../core/api/ResponseApi')
const ErrorApi = require('../../core/api/ErrorApi')
const service = require('./settings.service')
const securityService = require('./security.service')

async function getGeneral(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات عمومی دریافت شد', details: await service.getGeneral() }) }
  catch (error) { return next(error) }
}

async function saveGeneral(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'اطلاعات عمومی شرکت ذخیره شد', details: await service.saveGeneral(req.validated.body) }) }
  catch (error) { return next(error) }
}

async function getTax(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات مالیاتی دریافت شد', details: await service.getTaxSettings() }) }
  catch (error) { return next(error) }
}

async function saveTax(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات مالیاتی ذخیره شد', details: await service.saveTaxSettings(req.validated.body) }) }
  catch (error) { return next(error) }
}

async function getMoadian(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'پیکربندی مؤدیان دریافت شد', details: await service.getMoadianSettings() }) }
  catch (error) { return next(error) }
}
async function saveMoadian(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'اطلاعات پایهٔ اتصال مؤدیان ذخیره شد', details: await service.saveMoadianSettings(req.validated.body) }) }
  catch (error) { return next(error) }
}

async function getFinance(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات مالی دریافت شد', details: await service.getFinanceSettings() }) }
  catch (error) { return next(error) }
}

async function getFinanceCurrencies(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'ارزهای مجاز دریافت شد', details: { currencies: await service.getEnabledFinanceCurrencies() } }) }
  catch (error) { return next(error) }
}

async function saveFinance(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات مالی ذخیره شد', details: await service.saveFinanceSettings(req.validated.body) }) }
  catch (error) { return next(error) }
}

async function getInventory(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات انبار دریافت شد', details: await service.getInventorySettings() }) }
  catch (error) { return next(error) }
}
async function getInventoryDefaults(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'انبارهای پیش‌فرض دریافت شدند', details: await service.getInventoryDefaults() }) }
  catch (error) { return next(error) }
}

async function saveInventory(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات انبار ذخیره شد', details: await service.saveInventorySettings(req.validated.body) }) }
  catch (error) { return next(error) }
}

async function getSecurity(req, res, next) {
  try {
    const [settings, events] = await Promise.all([securityService.getSettings(), securityService.listRecentEvents()])
    return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات امنیتی دریافت شد', details: { settings, events } })
  } catch (error) { return next(error) }
}

async function saveSecurity(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات امنیتی ذخیره شد', details: await securityService.saveSettings(req.validated.body) }) }
  catch (error) { return next(error) }
}

async function getPrint(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات چاپ دریافت شد', details: await service.getPrintSettings() }) }
  catch (error) { return next(error) }
}
async function savePrint(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تنظیمات چاپ ذخیره شد', details: await service.savePrintSettings(req.validated.body) }) }
  catch (error) { return next(error) }
}
async function getDefaultPrint(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'قالب چاپ پیش‌فرض دریافت شد', details: await service.getDefaultPrintTemplate(req.params.type) }) }
  catch (error) { return next(error) }
}

async function uploadMedia(req, res, next) {
  try {
    if (!req.file) throw ErrorApi.badRequest('تصویر انتخاب نشده است')
    const details = await service.setMedia(req.params.kind, req.file.filename)
    return ResponseApi.ok(res, { type: 'SUCCESS', message: req.params.kind === 'logo' ? 'لوگوی شرکت ذخیره شد' : 'مهر شرکت ذخیره شد', details })
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {})
    return next(error)
  }
}

async function clearMedia(req, res, next) {
  try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'تصویر شرکت حذف شد', details: await service.clearMedia(req.params.kind) }) }
  catch (error) { return next(error) }
}

async function getMedia(req, res, next) {
  try {
    const filePath = await service.getMediaPath(req.params.kind)
    if (!filePath) throw ErrorApi.notFound('تصویر ثبت‌شده پیدا نشد')
    res.type(path.extname(filePath))
    res.set('Cache-Control', 'private, no-store')
    return res.sendFile(filePath, error => { if (error) next(error) })
  } catch (error) { return next(error) }
}

module.exports = { getGeneral, saveGeneral, getTax, saveTax, getMoadian, saveMoadian, getFinance, getFinanceCurrencies, saveFinance, getInventory, getInventoryDefaults, saveInventory, getSecurity, saveSecurity, getPrint, savePrint, getDefaultPrint, uploadMedia, clearMedia, getMedia }
