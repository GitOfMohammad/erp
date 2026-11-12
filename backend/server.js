const app = require('./app');
const env = require('./core/config/env');
const { sequelize } = require('./core/database/db');
const validateRuntimeConfig = require('./core/config/validateRuntimeConfig');

async function startServer() {
  validateRuntimeConfig();
  await sequelize.authenticate();
  return app.listen(env.server.port, () => {
    console.info('API server listening on port ' + env.server.port + ' (' + env.server.node + ')');
  });
}

startServer().catch((error) => {
  console.error('Unable to start the API server:', error.message);
  process.exitCode = 1;
});

module.exports = { startServer };