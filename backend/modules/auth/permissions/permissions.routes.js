const { Router } = require('express');
const controller = require('./permissions.controller');
const validator = require('./permissions.validator');
const schemaValidator = require('../../../core/middlewares/schemaValidator');
const idValidator = require('../../../core/middlewares/idValidator');
const authenticate = require('../../../core/middlewares/authenticate');
const authorization = require('../../../core/middlewares/authorization');

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Permissions
 *     description: دسترسی‌های تعریف‌شده توسط برنامه‌نویس
 * /permissions:
 *   get:
 *     summary: دریافت فهرست دسترسی‌ها
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
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
 *         description: فهرست دسترسی‌ها
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     details:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items: { $ref: '#/components/schemas/Permission' }
 *                         pagination: { type: object }
 *       401:
 *         description: توکن نامعتبر یا ارسال‌نشده
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       403:
 *         description: کاربر دسترسی لازم را ندارد
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get(
  '/',
  authenticate,
  authorization('permissions.read'),
  schemaValidator(validator.listPermissionsSchema, 'query'),
  controller.list,
);

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: دریافت یک دسترسی با شناسه
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: دسترسی پیدا شد
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccess'
 *                 - type: object
 *                   properties:
 *                     details: { $ref: '#/components/schemas/Permission' }
 *       401:
 *         description: توکن نامعتبر یا ارسال‌نشده
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       403:
 *         description: کاربر دسترسی لازم را ندارد
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: دسترسی پیدا نشد
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/:id', authenticate, authorization('permissions.read'), idValidator(), controller.getById);

module.exports = router;
