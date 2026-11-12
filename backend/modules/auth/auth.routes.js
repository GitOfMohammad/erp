const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const controller = require('./auth.controller');
const validator = require('./auth.validator');
const schemaValidator = require('../../core/middlewares/schemaValidator');
const authenticate = require('../../core/middlewares/authenticate');

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      success: false,
      type: 'TOO_MANY_REQUESTS',
      message: 'تعداد تلاش‌های ورود بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید',
      details: null,
    });
  },
});
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: ورود و مدیریت نشست کاربر
 * /auth/login:
 *   post:
 *     summary: ورود با نام کاربری و رمز عبور
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: توکن دسترسی و تمدید صادر شد }
 *       401: { description: اطلاعات ورود نادرست است }
 *       403: { description: کاربر نقش ندارد }
 *       429: { description: تلاش‌های ورود بیش از حد مجاز است }
 * /auth/refresh:
 *   post:
 *     summary: تمدید جفت توکن با refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: توکن قبلی چرخانده و توکن‌های جدید صادر شد }
 *       401: { description: توکن تمدید نامعتبر، منقضی یا قبلاً مصرف شده است }
 * /auth/me:
 *   get:
 *     summary: دریافت هویت و دسترسی‌های کاربر جاری
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: اطلاعات کاربر جاری }
 *       401: { description: توکن دسترسی نامعتبر است }
 * /auth/change-password:
 *   post:
 *     summary: تغییر رمز عبور کاربر جاری و باطل‌کردن همه نشست‌های فعال
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password, minLength: 5 }
 *               newPassword: { type: string, format: password, minLength: 5 }
 *     responses:
 *       200: { description: رمز تغییر کرد و همه نشست‌ها باطل شدند }
 *       401: { description: رمز فعلی نادرست یا نشست نامعتبر است }
 * /auth/logout:
 *   post:
 *     summary: خروج و باطل‌کردن نشست جاری
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: نشست باطل شد }
 *       401: { description: نشست معتبر نیست }
 */
router.post('/login', loginLimiter, schemaValidator(validator.loginSchema), controller.login);
router.post('/refresh', schemaValidator(validator.refreshSchema), controller.refresh);
router.use(authenticate);
router.get('/me', controller.me);
router.post('/change-password', passwordChangeLimiter, schemaValidator(validator.changePasswordSchema), controller.changePassword);
router.post('/logout', controller.logout);

module.exports = router;
