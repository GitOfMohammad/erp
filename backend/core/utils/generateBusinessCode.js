'use strict';

const crypto = require('node:crypto');
const ErrorApi = require('../api/ErrorApi');

module.exports = async function generateBusinessCode(model, prefix, transaction, fieldName = 'code') {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
    const code = `${prefix}-${suffix}`;
    const exists = await model.findOne({ where: { [fieldName]: code }, transaction });
    if (!exists) return code;
  }
  throw ErrorApi.conflict('ساخت کد یکتا ممکن نشد؛ دوباره تلاش کنید');
};
