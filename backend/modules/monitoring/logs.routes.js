const { Router } = require('express')
const authenticate = require('../../core/middlewares/authenticate')
const ErrorApi = require('../../core/api/ErrorApi')
const controller = require('./logs.controller')

const router = Router()
router.use(authenticate)
router.use((req, res, next) => req.user?.rolename?.toLocaleLowerCase('fa') === 'مدیر سایت' ? next() : next(ErrorApi.forbidden('داشبورد لاگ‌ها فقط برای مدیر سایت در دسترس است')))
router.get('/', controller.dashboard)

module.exports = router
