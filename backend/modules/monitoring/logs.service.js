const { Op, fn, col } = require('sequelize')
const { SystemLog, SecurityEvent } = require('../../core/database/models')

async function getDashboard({ page = 1, limit = 50, search = '', status = 'all', method = 'all' } = {}) {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 86400000)
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const where = { created_at: { [Op.gte]: weekAgo } }
  if (status === 'errors') where.status_code = { [Op.gte]: 400 }
  else if (status === 'success') where.status_code = { [Op.lt]: 400 }
  if (method !== 'all') where.method = method
  if (search) where[Op.or] = [
    { username: { [Op.like]: `%${search}%` } },
    { path: { [Op.like]: `%${search}%` } },
    { request_id: { [Op.like]: `%${search}%` } },
    { ip_address: { [Op.like]: `%${search}%` } },
  ]
  const [total24h, errors24h, total7d, avgDuration, result, securityEvents, topRoutes] = await Promise.all([
    SystemLog.count({ where: { created_at: { [Op.gte]: dayAgo } } }),
    SystemLog.count({ where: { created_at: { [Op.gte]: dayAgo }, status_code: { [Op.gte]: 400 } } }),
    SystemLog.count({ where: { created_at: { [Op.gte]: weekAgo } } }),
    SystemLog.findOne({ attributes: [[fn('AVG', col('duration_ms')), 'average']], where: { created_at: { [Op.gte]: dayAgo } }, raw: true }),
    SystemLog.findAndCountAll({ where, attributes: ['id', 'request_id', 'user_id', 'username', 'method', 'path', 'status_code', 'duration_ms', 'ip_address', 'created_at'], order: [['created_at', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit }),
    SecurityEvent.findAll({ attributes: ['id', 'username', 'event_type', 'ip_address', 'details', 'created_at'], order: [['created_at', 'DESC']], limit: 20 }),
    SystemLog.findAll({ attributes: ['path', [fn('COUNT', col('id')), 'count']], where: { created_at: { [Op.gte]: dayAgo } }, group: ['path'], order: [[fn('COUNT', col('id')), 'DESC']], limit: 5, raw: true }),
  ])
  return {
    summary: { requests24h: total24h, errors24h, requests7d: total7d, averageDurationMs: Math.round(Number(avgDuration?.average || 0)) },
    logs: result.rows,
    total: result.count,
    page,
    limit,
    pages: Math.max(1, Math.ceil(result.count / limit)),
    securityEvents,
    topRoutes,
  }
}

module.exports = { getDashboard }
