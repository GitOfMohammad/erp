const morgan = require('morgan');
const env = require('../config/env');
module.exports = morgan(env.server.node === 'production' ? 'combined' : 'dev');