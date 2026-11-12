const { test } = require('node:test');
const assert = require('node:assert/strict');
const Joi = require('joi');
const schemaValidator = require('../../core/middlewares/schemaValidator');
const { loginSchema, refreshSchema } = require('../../modules/auth/auth.validator');
const { createUserSchema, updateUserSchema, listUsersSchema } = require('../../modules/auth/users/users.validator');

test('login validation trims username and accepts valid credentials', () => {
  const { error, value } = loginSchema.validate({ username: '  sara  ', password: 'password123' });
  assert.equal(error, undefined);
  assert.equal(value.username, 'sara');
});

test('login validation rejects missing or too-short credentials', () => {
  assert.ok(loginSchema.validate({ username: 'a', password: '12345' }).error);
  assert.ok(loginSchema.validate({ username: 'sara', password: '1234' }).error);
  assert.equal(loginSchema.validate({ username: 'sara', password: '12345' }).error, undefined);
});

test('refresh validation requires a refresh token', () => {
  assert.ok(refreshSchema.validate({}).error);
  assert.equal(refreshSchema.validate({ refreshToken: 'token' }).error, undefined);
});

test('create-user validation applies default active status and phone', () => {
  const { error, value } = createUserSchema.validate({ username: 'sara', password: 'password123' });
  assert.equal(error, undefined);
  assert.equal(value.isactive, 1);
  assert.equal(value.phone, null);
  assert.equal(createUserSchema.validate({ username: 'sara', password: '12345' }).error, undefined);
  assert.ok(createUserSchema.validate({ username: 'sara', password: '1234' }).error);
});

test('update-user validation requires at least one field', () => {
  assert.ok(updateUserSchema.validate({}).error);
  assert.equal(updateUserSchema.validate({ isactive: 0 }).error, undefined);
});

test('list-user validation applies pagination defaults and rejects oversized limits', () => {
  const { error, value } = listUsersSchema.validate({});
  assert.equal(error, undefined);
  assert.deepEqual(value, { page: 1, limit: 20 });
  assert.ok(listUsersSchema.validate({ limit: 101 }).error);
});

test('schema middleware stores validated values and strips unknown fields', () => {
  const schema = Joi.object({ name: Joi.string().trim().required() });
  const req = { body: { name: '  Sara ', extra: 'discard me' } };
  let error;
  schemaValidator(schema)(req, {}, (err) => { error = err; });
  assert.equal(error, undefined);
  assert.deepEqual(req.validated.body, { name: 'Sara' });
});

test('schema middleware forwards a 400 validation error', () => {
  const schema = Joi.object({ name: Joi.string().required() });
  let error;
  schemaValidator(schema)({ body: {} }, {}, (err) => { error = err; });
  assert.equal(error.statusCode, 400);
  assert.equal(error.type, 'BAD_REQUEST');
  assert.ok(Array.isArray(error.details));
});
