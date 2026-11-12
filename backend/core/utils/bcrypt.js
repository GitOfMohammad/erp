const bcrypt = require('bcrypt');
const env = require('../config/env');

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, env.bcrypt.salt);
}
async function comparePassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

module.exports = { hashPassword, comparePassword };