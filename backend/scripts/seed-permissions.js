const { sequelize } = require('../core/database/db');
const permissionsSeeder = require('../core/database/seeders/permissions.seeder');

permissionsSeeder.up()
  .then(() => {
    console.log('Permission catalog synchronized successfully.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());