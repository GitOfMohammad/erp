const crypto = require('node:crypto')
const { Op } = require('sequelize')
const { SystemLog } = require('../database/models')

const RETENTION_DAYS = 30
let lastPrunedAt = 0

module.exports = (apiPrefix = '/api/v1') => (req, res, next) => {
  const path = req.path || ''
  if (!path.startsWith(`${apiPrefix}/`) || path.startsWith(`${apiPrefix}/logs`)) return next()

  const startedAt = process.hrtime.bigint()
  const requestId = crypto.randomUUID()
  res.setHeader('X-Request-Id', requestId)
  res.once('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1000000n)
    const actor = req.user || {}
    SystemLog.create({
      request_id: requestId,
      user_id: actor.id || null,
      username: actor.username?.slice(0, 100) || null,
      method: req.method.slice(0, 10),
      path: path.slice(0, 255),
      status_code: res.statusCode,
      duration_ms: Math.min(durationMs, 4294967295),
      ip_address: (req.ip || req.socket?.remoteAddress || '').slice(0, 64) || null,
      user_agent: req.get('user-agent')?.slice(0, 500) || null,
    }).catch(error => console.error('System request log could not be stored:', error.message))

    const now = Date.now()
    if (now - lastPrunedAt > 24 * 60 * 60 * 1000) {
      lastPrunedAt = now
      SystemLog.destroy({ where: { created_at: { [Op.lt]: new Date(now - RETENTION_DAYS * 86400000) } } })
        .catch(error => console.error('Old system request logs could not be pruned:', error.message))
    }
  })
  next()
}
