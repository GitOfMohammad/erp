const ResponseApi = require('../../../core/api/ResponseApi');
const service = require('./users.service');

async function list(req, res) {
  const result = await service.list(req.validated.query);
   ResponseApi.ok(res, {
    type: 'USERS_LISTED',
    message: 'فهرست کاربران دریافت شد',
    details: result,
  });
}

async function getById(req, res) {
  const user = await service.getById(req.params.id);
   ResponseApi.ok(res, {
    type: 'USER_FOUND',
    message: 'کاربر دریافت شد',
    details: user,
  });
}

async function create(req, res) {
  const user = await service.create(req.validated.body);
   ResponseApi.created(res, {
    type: 'USER_CREATED',
    message: 'کاربر ایجاد شد',
    details: user,
  });
}

async function update(req, res) {
  const user = await service.update(req.params.id, req.validated.body, { ipAddress: req.ip, userAgent: req.get('user-agent'), actorUsername: req.user.username });
   ResponseApi.ok(res, {
    type: 'USER_UPDATED',
    message: 'کاربر ویرایش شد',
    details: user,
  });
}

async function assignRole(req, res) {
  const result = await service.assignRole(req.params.id, req.validated.body.roleId, { ipAddress: req.ip, userAgent: req.get('user-agent'), actorUsername: req.user.username });
   ResponseApi.ok(res, {
    type: 'USER_ROLE_ASSIGNED',
    message: 'نقش کاربر با موفقیت تنظیم شد',
    details: result,
  });
}

module.exports = { list, getById, create, update, assignRole };
