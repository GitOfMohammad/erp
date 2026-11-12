const { Router } = require('express');
const controller = require('./roles.controller');
const validator = require('./roles.validator');
const schemaValidator = require('../../../core/middlewares/schemaValidator');
const idValidator = require('../../../core/middlewares/idValidator');
const authenticate = require('../../../core/middlewares/authenticate');
const authorization = require('../../../core/middlewares/authorization');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Roles
 *     description: مدیریت نقش‌ها و دسترسی‌های هر نقش
 * /roles:
 *   get:
 *     summary: دریافت فهرست نقش‌ها
 *     tags: [Roles]
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
 *       200:
 *         description: فهرست نقش‌ها
 *       401: { description: توکن نامعتبر یا ارسال‌نشده }
 *       403: { description: دسترسی لازم وجود ندارد }
 *   post:
 *     summary: ایجاد نقش
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               description: { type: string, nullable: true }
 *     responses:
 *       201: { description: نقش ایجاد شد }
 *       409: { description: نام نقش تکراری است }
 */
router.get('/', authorization('roles.read'), schemaValidator(validator.listRolesSchema, 'query'), controller.list);
router.post('/', authorization('roles.create'), schemaValidator(validator.createRoleSchema), controller.create);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: دریافت نقش با شناسه
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: نقش پیدا شد }
 *       404: { description: نقش پیدا نشد }
 *   patch:
 *     summary: ویرایش نام یا توضیحات نقش
 *     tags: [Roles]
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
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               description: { type: string, nullable: true }
 *     responses:
 *       200: { description: نقش ویرایش شد }
 *       404: { description: نقش پیدا نشد }
 *       409: { description: نام نقش تکراری است }
 *   delete:
 *     summary: حذف نقش
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: نقش حذف شد }
 *       404: { description: نقش پیدا نشد }
 *       409: { description: نقش به کاربران یا داده‌های دیگر متصل است }
 */
router.get('/:id', authorization('roles.read'), idValidator(), controller.getById);
router.patch('/:id', authorization('roles.update'), idValidator(), schemaValidator(validator.updateRoleSchema), controller.update);
router.delete('/:id', authorization('roles.delete'), idValidator(), controller.remove);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   put:
 *     summary: جایگزینی کامل دسترسی‌های یک نقش
 *     description: کدهای ارسالی باید در catalog دسترسی‌های تعریف‌شده توسط برنامه‌نویس وجود داشته باشند. آرایه خالی همه دسترسی‌های نقش را پاک می‌کند.
 *     tags: [Roles]
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
 *             required: [permissionCodes]
 *             properties:
 *               permissionCodes:
 *                 type: array
 *                 items: { type: string, example: permissions.read }
 *     responses:
 *       200: { description: دسترسی‌های نقش جایگزین شد }
 *       400: { description: کد دسترسی تعریف‌نشده یا درخواست نامعتبر است }
 *       404: { description: نقش پیدا نشد }
 */
router.put(
  '/:id/permissions',
  authorization('roles.permissions.update'),
  idValidator(),
  schemaValidator(validator.replaceRolePermissionsSchema),
  controller.replacePermissions,
);

module.exports = router;
