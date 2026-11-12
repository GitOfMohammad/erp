const jwt = require('jsonwebtoken');
const env = require('../config/env');

function getSecret(name) {
  const secret = env.jwt[name];
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(`JWT configuration error: ${name} must contain at least 32 bytes.`);
  }
  if (secret.startsWith('replace-with-')) {
    throw new Error(`JWT configuration error: replace the example value for ${name}.`);
  }
  if (name === 'secret_key' && secret === env.jwt.refresh_key) {
    throw new Error('JWT configuration error: access and refresh keys must be different.');
  }
  if (name === 'refresh_key' && secret === env.jwt.secret_key) {
    throw new Error('JWT configuration error: access and refresh keys must be different.');
  }
  return secret;
}

function signAccessToken(payload) {
  return jwt.sign({ ...payload, tokenUse: 'access' }, getSecret('secret_key'), {
    algorithm: 'HS256',
    expiresIn: env.jwt.secret_key_expire_time,
  });
}

function signRefreshToken(payload, expiresIn = env.jwt.refresh_key_expire_time) {
  return jwt.sign({ ...payload, tokenUse: 'refresh' }, getSecret('refresh_key'), {
    algorithm: 'HS256',
    expiresIn,
  });
}

function verifyTokenUse(token, secretName, expectedTokenUse) {
  const payload = jwt.verify(token, getSecret(secretName), { algorithms: ['HS256'] });
  if (!payload || typeof payload !== 'object' || payload.tokenUse !== expectedTokenUse) {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return payload;
}

function verifyAccessToken(token) {
  return verifyTokenUse(token, 'secret_key', 'access');
}

function verifyRefreshToken(token) {
  return verifyTokenUse(token, 'refresh_key', 'refresh');
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
