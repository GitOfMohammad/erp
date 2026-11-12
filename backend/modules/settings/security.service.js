const { Op } = require('sequelize')
const ErrorApi = require('../../core/api/ErrorApi')
const { SecuritySetting, SecurityEvent } = require('../../core/database/models')

const defaults = Object.freeze({ id: 1, minimumPasswordLength: 8, requireNumber: false, requireSymbol: false, sessionDurationHours: 168, recordSecurityEvents: true, eventRetentionDays: 90 })
const plain = row => row?.get ? row.get({ plain: true }) : row

async function getSettings() {
  return { ...defaults, ...(plain(await SecuritySetting.findByPk(1)) || {}) }
}
async function saveSettings(values) {
  await SecuritySetting.upsert({ id: 1, ...values })
  return getSettings()
}
function validatePassword(password, settings) {
  if (Buffer.byteLength(password, 'utf8') > 72) throw ErrorApi.badRequest('رمز عبور نباید بیشتر از ۷۲ بایت باشد')
  const length = [...password].length
  if (length < settings.minimumPasswordLength) throw ErrorApi.badRequest(`رمز عبور باید دست‌کم ${settings.minimumPasswordLength} نویسه داشته باشد`)
  if (settings.requireNumber && !/\p{N}/u.test(password)) throw ErrorApi.badRequest('رمز عبور باید دست‌کم یک رقم داشته باشد')
  if (settings.requireSymbol && !/[^\p{L}\p{N}\s]/u.test(password)) throw ErrorApi.badRequest('رمز عبور باید دست‌کم یک نماد داشته باشد')
}
async function recordEvent({ eventType, userId = null, username = null, ipAddress = null, userAgent = null, details = null }) {
  const settings = await getSettings()
  if (!settings.recordSecurityEvents) return
  const now = new Date()
  await SecurityEvent.create({ user_id: userId, username: username?.slice(0, 100) || null, event_type: eventType, ip_address: ipAddress?.slice(0, 64) || null, user_agent: userAgent?.slice(0, 500) || null, details: details?.slice(0, 500) || null })
  const cutoff = new Date(now.getTime() - settings.eventRetentionDays * 86400000)
  await SecurityEvent.destroy({ where: { created_at: { [Op.lt]: cutoff } } })
}
async function listRecentEvents(limit = 100) {
  const rows = await SecurityEvent.findAll({ attributes: ['id', 'user_id', 'username', 'event_type', 'ip_address', 'user_agent', 'details', 'created_at'], order: [['created_at', 'DESC']], limit })
  return rows.map(plain)
}
module.exports = { defaults, getSettings, saveSettings, validatePassword, recordEvent, listRecentEvents }
