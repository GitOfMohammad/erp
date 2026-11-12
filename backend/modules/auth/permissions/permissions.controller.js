const ResponseApi = require('../../../core/api/ResponseApi');
const service = require('./permissions.service');

async function list(req, res) {
  const result = await service.list(req.validated.query);
   ResponseApi.ok(res, {
    type: 'PERMISSIONS_LISTED',
    message: 'فهرست دسترسی‌های تعریف‌شده دریافت شد',
    details: result,
  });
}

async function getById(req, res) {
  const permission = await service.getById(req.params.id);
   ResponseApi.ok(res, {
    type: 'PERMISSION_FOUND',
    message: 'دسترسی دریافت شد',
    details: permission,
  });
}

module.exports = { list, getById };
