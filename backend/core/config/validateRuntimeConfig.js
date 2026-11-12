const env = require('./env');

module.exports = function validateRuntimeConfig() {
  const issues = [];
  const accessSecret = env.jwt.secret_key || '';
  const refreshSecret = env.jwt.refresh_key || '';

  if (accessSecret.length < 32) issues.push('SECRET_KEY must contain at least 32 characters');
  if (refreshSecret.length < 32) issues.push('REFRESH_KEY must contain at least 32 characters');
  if (accessSecret && accessSecret === refreshSecret) issues.push('SECRET_KEY and REFRESH_KEY must be different');
  if (!Number.isInteger(env.bcrypt.salt) || env.bcrypt.salt < 4 || env.bcrypt.salt > 31) {
    issues.push('SALT_ROUNDS must be an integer between 4 and 31');
  }

  if (env.server.node === 'production') {
    const origin = env.cors.origin || '';
    if (!origin || origin === '*') {
      issues.push('CORS_ORIGIN must be an explicit HTTPS origin in production');
    } else {
      try {
        const parsedOrigin = new URL(origin);
        if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) {
          issues.push('CORS_ORIGIN must be a single HTTPS origin without a path');
        }
      } catch {
        issues.push('CORS_ORIGIN must be a valid HTTPS origin');
      }
    }

    if (!env.db.pass) issues.push('DB_PASS must be set in production');
    if (!env.db.user || env.db.user.toLowerCase() === 'root') {
      issues.push('DB_USER must be a dedicated non-root account in production');
    }
    if (['localhost', '127.0.0.1', '::1'].includes((env.db.host || '').toLowerCase())) {
      issues.push('DB_HOST must point to the production database in production');
    }
  }

  if (issues.length) {
    throw new Error('Invalid runtime configuration: ' + issues.join('; '));
  }
};