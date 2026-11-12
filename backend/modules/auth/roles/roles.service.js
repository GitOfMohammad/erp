const ErrorApi = require('../../../core/api/ErrorApi');
const repository = require('./roles.repository');

async function list({ page, limit, search }) {
  const result = await repository.findAll({
    limit,
    offset: (page - 1) * limit,
    search,
  });

  return {
    items: result.rows,
    pagination: {
      page,
      limit,
      totalItems: result.count,
      totalPages: Math.ceil(result.count / limit),
    },
  };
}

async function getById(id) {
  const role = await repository.findById(id);
  if (!role) throw ErrorApi.notFound('نقش مورد نظر پیدا نشد');
  return role;
}

function create(data) {
  return repository.create(data);
}

async function update(id, data) {
  const role = await repository.updateById(id, data);
  if (!role) throw ErrorApi.notFound('نقش مورد نظر پیدا نشد');
  return role;
}

async function remove(id) {
  const role = await repository.deleteById(id);
  if (!role) throw ErrorApi.notFound('نقش مورد نظر پیدا نشد');
  return role;
}

async function replacePermissions(id, permissionCodes) {
  await getById(id);

  const permissions = await repository.findPermissionsByCodes(permissionCodes);
  const existingCodes = new Set(permissions.map((permission) => permission.code));
  const unknownCodes = permissionCodes.filter((code) => !existingCodes.has(code));

  if (unknownCodes.length > 0) {
    throw ErrorApi.badRequest('برخی از کدهای دسترسی در فهرست برنامه تعریف نشده‌اند', {
      permissionCodes: unknownCodes,
    });
  }

  const role = await repository.replacePermissions(id, permissions);
  if (!role) throw ErrorApi.notFound('نقش مورد نظر پیدا نشد');
  return role;
}

module.exports = { list, getById, create, update, remove, replacePermissions };
