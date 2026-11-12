const { test } = require('node:test');
const assert = require('node:assert/strict');
const authorization = require('../../core/middlewares/authorization');
const ErrorApi = require('../../core/api/ErrorApi');

test('authorization allows a user with the requested permission', () => {
  let nextCalled = false;
  authorization('users.view')(
    { user: { permissions: ['users.view'] } },
    {},
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
});

test('authorization rejects a user without the requested permission', () => {
  assert.throws(
    () => authorization('users.view')({ user: { permissions: [] } }, {}, () => {}),
    (error) => error instanceof ErrorApi && error.statusCode === 403 && error.type === 'FORBIDDEN',
  );
});

test('authorization rejects a request without an authenticated user', () => {
  assert.throws(
    () => authorization('users.view')({}, {}, () => {}),
    (error) => error instanceof ErrorApi && error.statusCode === 401,
  );
});

test('authorization reports a missing route permission as a configuration error', () => {
  assert.throws(
    () => authorization(' ')({ user: { permissions: [] } }, {}, () => {}),
    (error) => error instanceof ErrorApi && error.statusCode === 500,
  );
});
