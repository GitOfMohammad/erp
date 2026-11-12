const { Op } = require('sequelize');
const { Permission } = require('../../../core/database/models');

function findAll({ limit, offset, search }) {
  const where = search
    ? {
        [Op.or]: [
          { code: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
        ],
      }
    : undefined;

  return Permission.findAndCountAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
  });
}

function findById(id) {
  return Permission.findByPk(id);
}

module.exports = { findAll, findById };
