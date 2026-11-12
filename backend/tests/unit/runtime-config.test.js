const { test } = require('node:test');
const assert = require('node:assert/strict');

const env = require('../../core/config/env');
const validateRuntimeConfig = require('../../core/config/validateRuntimeConfig');

function withConfig(changes, action) {
  const originals = new Map();
  for (const [target, values] of Object.entries(changes)) {
    for (const [key, value] of Object.entries(values)) {
      originals.set([target, key], env[target][key]);
      env[target][key] = value;
    }
  }
  try {
    return action();
  } finally {
    for (const [[target, key], value] of originals) env[target][key] = value;
  }
}

test('runtime config accepts the current development setup', () => {
  assert.doesNotThrow(() => validateRuntimeConfig());
});

test('production config rejects wildcard CORS and local root database defaults', () => {
  assert.throws(() => withConfig({
    server: { node: 'production' },
    cors: { origin: '*' },
    db: { host: 'localhost', user: 'root', pass: '' },
  }, validateRuntimeConfig), /CORS_ORIGIN|DB_PASS|DB_USER|DB_HOST/);
});

test('production config rejects non-HTTPS frontend origins', () => {
  assert.throws(() => withConfig({
    server: { node: 'production' },
    cors: { origin: 'http://erp.example.com' },
    db: { host: 'db.internal.example', user: 'erp_app', pass: 'strong-password' },
  }, validateRuntimeConfig), /HTTPS/);
});

test('runtime config accepts a dedicated production database and HTTPS origin', () => {
  assert.doesNotThrow(() => withConfig({
    server: { node: 'production' },
    cors: { origin: 'https://erp.example.com' },
    db: { host: 'db.internal.example', user: 'erp_app', pass: 'strong-password' },
    jwt: {
      secret_key: 'different-access-secret-with-at-least-32-characters',
      refresh_key: 'different-refresh-secret-with-at-least-32-characters',
    },
    bcrypt: { salt: 12 },
  }, validateRuntimeConfig));
});

test('runtime config rejects short or reused JWT secrets and invalid bcrypt cost', () => {
  assert.throws(() => withConfig({
    jwt: { secret_key: 'short', refresh_key: 'different-refresh-secret-with-at-least-32-characters' },
  }, validateRuntimeConfig), /SECRET_KEY/);
  assert.throws(() => withConfig({
    jwt: {
      secret_key: 'same-secret-with-at-least-32-characters',
      refresh_key: 'same-secret-with-at-least-32-characters',
    },
  }, validateRuntimeConfig), /different/);
  assert.throws(() => withConfig({ bcrypt: { salt: 2 } }, validateRuntimeConfig), /SALT_ROUNDS/);
});