const Joi = require('joi');

const listPermissionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(''),
}).required();

module.exports = { listPermissionsSchema };
