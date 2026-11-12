const ErrorApi = require('../../../core/api/ErrorApi');
const repository = require('./permissions.repository');

async function list({ page, limit, search }) {
  const offset = (page - 1) * limit;
  const result = await repository.findAll({ limit, offset, search });

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
  const permission = await repository.findById(id);
  if (!permission) throw ErrorApi.notFound('دسترسی مورد نظر پیدا نشد');
  return permission;
}

module.exports = { list, getById };
