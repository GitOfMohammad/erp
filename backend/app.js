const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { rateLimit } = require('express-rate-limit');

const env = require('./core/config/env');
const swaggerDocument = require('./core/config/swagger');
const logger = require('./core/middlewares/logger');
const systemRequestLogger = require('./core/middlewares/systemRequestLogger');
const ResponseApi = require('./core/api/ResponseApi');
const notFoundHandler = require('./core/middlewares/notFoundHandler');
const globalErrorHandler = require('./core/middlewares/globalErrorHandler');

const app = express();
app.disable('x-powered-by');
app.use(logger);

// Swagger UI injects inline initialization code, so its route uses Helmet without CSP.
app.use(
  '/api-docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    swaggerOptions: { persistAuthorization: false },
  }),
);

app.use(helmet());
app.use(cors({ origin: env.cors.origin, credentials: env.cors.origin !== '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(systemRequestLogger(env.api.prefix));
// Publicly serve images only; documents and PDFs require protected routes.
app.use('/uploads/images', express.static(require('node:path').join(env.uploads.directory, 'images'), { fallthrough: false }));
// Keep a generous shared API ceiling for ordinary multi-query SPA navigation.
// Login and password changes have separate, much stricter limits in auth.routes.
app.use(rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    success: false,
    type: 'RATE_LIMITED',
    message: 'تعداد درخواست‌ها در این بازه زیاد بوده است. چند دقیقه صبر کنید و دوباره تلاش کنید.',
    retryAfter: Number(res.getHeader('Retry-After')) || null,
  }),
  skip: (req) => req.path === '/health',
}));

app.get('/health', (req, res) => ResponseApi.ok(res, {
  type: 'SUCCESS',
  message: 'API is healthy',
  details: { status: 'ok' },
}));
app.use(env.api.prefix, require('./modules'));
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
