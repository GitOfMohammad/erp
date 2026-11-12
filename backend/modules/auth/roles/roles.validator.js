const Joi = require('joi');

const createRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(500).allow('', null).default(null),
}).required();

const updateRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(500).allow('', null),
}).min(1).required();

const listRolesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(''),
}).required();

const replaceRolePermissionsSchema = Joi.object({
  permissionCodes: Joi.array()
    .items(Joi.string().trim().lowercase().min(1).max(100))
    .unique()
    .max(200)
    .required(),
}).required();

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  listRolesSchema,
  replaceRolePermissionsSchema,
};
