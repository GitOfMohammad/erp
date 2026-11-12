const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().trim().min(2).max(100).required(),
  password: Joi.string().min(5).max(72).required(),
}).required();

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
}).required();

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(5).max(72).required(),
  newPassword: Joi.string().min(5).max(72).required(),
}).required();

module.exports = { loginSchema, refreshSchema, changePasswordSchema };
