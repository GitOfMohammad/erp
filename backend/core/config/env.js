const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  server: {
    port: Number(process.env.PORT?.trim() || 3000),
    node: process.env.ENV_NODE?.trim() || 'development',
  },
  db: {
    host: process.env.DB_HOST?.trim() || 'localhost',
    port: Number(process.env.DB_PORT?.trim() || 3306),
    user: process.env.DB_USER?.trim() || 'root',
    pass: process.env.DB_PASS?.trim() ?? '',
    name: process.env.DB_NAME?.trim() || 'erp_2',
  },
  jwt: {
    secret_key: process.env.SECRET_KEY?.trim(),
    secret_key_expire_time: process.env.SECRET_KEY_EXPIRE_TIME?.trim() || '15m',
    refresh_key: process.env.REFRESH_KEY?.trim(),
    refresh_key_expire_time: process.env.REFRESH_KEY_EXPIRE_TIME?.trim() || '7d',
  },
  bcrypt: {
    salt: Number(process.env.SALT_ROUNDS?.trim() || 12),
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS?.trim() || 900000),
    max: Number(process.env.RATE_LIMIT_MAX?.trim() || 1000),
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.trim() || '*',
  },
  api: {
    prefix: process.env.API_PREFIX?.trim() || '/api/v1',
  },
  uploads: {
    directory: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR?.trim() || 'uploads'),
    maxFileSizeBytes: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB?.trim() || 5) * 1024 * 1024,
  },
};
