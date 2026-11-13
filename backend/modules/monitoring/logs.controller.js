const ResponseApi = require('../../core/api/ResponseApi')
const service = require('./logs.service')

async function dashboard(req, res, next) {
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1))
    const limit = Math.max(10, Math.min(100, Number.parseInt(req.query.limit, 10) || 50))
    const status = ['all', 'errors', 'success'].includes(req.query.status) ? req.query.status : 'all'
    const method = ['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.query.method) ? req.query.method : 'all'
    const search = String(req.query.search || '').trim().slice(0, 100)
    const details = await service.getDashboard({ page, limit, status, method, search })
    return ResponseApi.ok(res, { type: 'SUCCESS', message: 'گزارش پایش سامانه دریافت شد', details })
  } catch (error) { return next(error) }
}

module.exports = { dashboard }
