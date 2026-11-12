const env = require('../../core/config/env');

module.exports = {
  development: {
    username: env.db.user,
    password: env.db.pass,
    database: env.db.name,
    host: env.db.host,
    port: env.db.port,
    dialect: 'mysql',
    logging: false,
    migrationStorage: 'sequelize',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
  },
};

