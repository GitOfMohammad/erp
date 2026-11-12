const ResponseApi = require('../../../core/api/ResponseApi');
const service = require('./roles.service');

async function list(req, res) {
  const result = await service.list(req.validated.query);
   ResponseApi.ok(res, {
    type: 'ROLES_LISTED',
    message: 'فهرست نقش‌ها دریافت شد',
    details: result,
  });
}

async function getById(req, res) {
  const role = await service.getById(req.params.id);
   ResponseApi.ok(res, {
    type: 'ROLE_FOUND',
    message: 'نقش دریافت شد',
    details: role,
  });
}

async function create(req, res) {
  const role = await service.create(req.validated.body);
   ResponseApi.created(res, {
    type: 'ROLE_CREATED',
    message: 'نقش ایجاد شد',
    details: role,
  });
}

async function update(req, res) {
  const role = await service.update(req.params.id, req.validated.body);
   ResponseApi.ok(res, {
    type: 'ROLE_UPDATED',
    message: 'نقش ویرایش شد',
    details: role,
  });
}

async function remove(req, res) {
  const role = await service.remove(req.params.id);
   ResponseApi.ok(res, {
    type: 'ROLE_DELETED',
    message: 'نقش حذف شد',
    details: { id: role.id },
  });
}

async function replacePermissions(req, res) {
  const role = await service.replacePermissions(
    req.params.id,
    req.validated.body.permissionCodes,
  );
   ResponseApi.ok(res, {
    type: 'ROLE_PERMISSIONS_UPDATED',
    message: 'دسترسی‌های نقش به‌روزرسانی شد',
    details: role,
  });
}

module.exports = { list, getById, create, update, remove, replacePermissions };
