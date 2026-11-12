const Joi = require('joi');

const username = Joi.string().trim().min(2).max(100);
const phone = Joi.string().trim().max(20).allow('', null);
const isactive = Joi.number().integer().valid(0, 1);

const createUserSchema = Joi.object({
  username: username.required(),
  password: Joi.string().min(5).max(72).required(),
  phone: phone.default(null),
  isactive: isactive.default(1),
}).required();

const updateUserSchema = Joi.object({
  username,
  password: Joi.string().min(5).max(72),
  phone,
  isactive,
}).min(1).required();

const assignRoleSchema = Joi.object({
  roleId: Joi.string().guid().required(),
}).required();

const listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(''),
}).required();

module.exports = { createUserSchema, updateUserSchema, assignRoleSchema, listUsersSchema };
