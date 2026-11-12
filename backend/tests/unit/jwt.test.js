const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.SECRET_KEY = 'unit-test-access-secret-with-at-least-32-bytes';
process.env.REFRESH_KEY = 'unit-test-refresh-secret-with-at-least-32-bytes';
process.env.SECRET_KEY_EXPIRE_TIME = '15m';
process.env.REFRESH_KEY_EXPIRE_TIME = '7d';

const env = require('../../core/config/env');
const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../core/utils/jwt');

test('access token signs and verifies expected identity claims', () => {
  const token = signAccessToken({ sub: 'user-1', sid: 'session-1' });
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.sid, 'session-1');
  assert.equal(payload.tokenUse, 'access');
});

test('refresh token signs and verifies as a refresh token', () => {
  const token = signRefreshToken({ sub: 'user-1', sid: 'session-1' });
  const payload = verifyRefreshToken(token);
  assert.equal(payload.tokenUse, 'refresh');
});

test('token type and signing key are checked during verification', () => {
  const accessToken = signAccessToken({ sub: 'user-1' });
  assert.throws(() => verifyRefreshToken(accessToken));
  assert.throws(() => verifyAccessToken('not-a-jwt'));
});

test('JWT signing rejects short or reused secrets', () => {
  const originalAccess = env.jwt.secret_key;
  const originalRefresh = env.jwt.refresh_key;
  try {
    env.jwt.secret_key = 'too-short';
    assert.throws(() => signAccessToken({ sub: 'user-1' }), /at least 32 bytes/);
    env.jwt.secret_key = originalRefresh;
    assert.throws(() => signAccessToken({ sub: 'user-1' }), /must be different/);
  } finally {
    env.jwt.secret_key = originalAccess;
    env.jwt.refresh_key = originalRefresh;
  }
});
