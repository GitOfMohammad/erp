const { Router } = require('express');
const controller = require('./users.controller');
const validator = require('./users.validator');
const schemaValidator = require('../../../core/middlewares/schemaValidator');
const idValidator = require('../../../core/middlewares/idValidator');
const authenticate = require('../../../core/middlewares/authenticate');
const authorization = require('../../../core/middlewares/authorization');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: مدیریت کاربران
 * /users:
 *   get:
 *     summary: دریافت فهرست کاربران
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *     responses:
 *       200: { description: فهرست کاربران }
 *       401: { description: توکن نامعتبر یا ارسال‌نشده }
 *       403: { description: دسترسی لازم وجود ندارد }
 *   post:
 *     summary: ایجاد کاربر
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, minLength: 2, maxLength: 100 }
 *               password: { type: string, format: password, minLength: 5, maxLength: 72 }
 *               phone: { type: string, nullable: true }
 *               isactive: { type: integer, enum: [0, 1], default: 1 }
 *     responses:
 *       201: { description: کاربر ایجاد شد؛ رمز خام در پاسخ ارسال نمی‌شود }
 *       409: { description: username یا phone تکراری است }
 */
router.get('/', authorization('users.read'), schemaValidator(validator.listUsersSchema, 'query'), controller.list);
router.post('/', authorization('users.create'), schemaValidator(validator.createUserSchema), controller.create);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: دریافت کاربر با شناسه
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: کاربر پیدا شد }
 *       404: { description: کاربر پیدا نشد }
 *   patch:
 *     summary: ویرایش اطلاعات کاربر، شامل تغییر رمز
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, minLength: 2, maxLength: 100 }
 *               password: { type: string, format: password, minLength: 5, maxLength: 72 }
 *               phone: { type: string, nullable: true }
 *               isactive: { type: integer, enum: [0, 1] }
 *     responses:
 *       200: { description: کاربر ویرایش شد }
 *       404: { description: کاربر پیدا نشد }
 *       409: { description: username یا phone تکراری است }
 */
router.put(
  '/:id/role',
  authorization('users.role.update'),
  idValidator(),
  schemaValidator(validator.assignRoleSchema),
  controller.assignRole,
);
router.get('/:id', authorization('users.read'), idValidator(), controller.getById);
router.patch('/:id', authorization('users.update'), idValidator(), schemaValidator(validator.updateUserSchema), controller.update);

/**
 * @swagger
 * /users/{id}/role:
 *   put:
 *     summary: تعیین یا تغییر نقش کاربر
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId]
 *             properties:
 *               roleId: { type: string, format: uuid }
 *     responses:
 *       200: { description: نقش کاربر تنظیم شد }
 *       400: { description: شناسه نامعتبر است }
 *       401: { description: احراز هویت لازم است }
 *       403: { description: دسترسی users.role.update لازم است }
 *       404: { description: کاربر یا نقش پیدا نشد }
 */
module.exports = router;
