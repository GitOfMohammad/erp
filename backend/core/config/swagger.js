const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ERP Backend API',
      version: '1.0.0',
      description: 'مستندات API بک‌اند ERP',
    },
    servers: [{ url: env.api.prefix, description: 'Local API server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Permission: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'permissions.read' },
            name: { type: 'string', example: 'مشاهده دسترسی‌ها' },
            description: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'مدیر فروش' },
            description: { type: 'string', nullable: true },
            permissions: { type: 'array', items: { $ref: '#/components/schemas/Permission' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            phone: { type: 'string', nullable: true },
            isactive: { type: 'integer', enum: [0, 1], default: 1 },
            role: { allOf: [{ $ref: '#/components/schemas/Role' }], nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ApiSuccess: {
          type: 'object',
          required: ['success', 'type', 'message', 'details'],
          properties: {
            success: { type: 'boolean', example: true },
            type: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object', nullable: true },
          },
        },
        ApiError: {
          type: 'object',
          required: ['success', 'type', 'message', 'details'],
          properties: {
            success: { type: 'boolean', example: false },
            type: { type: 'string' },
            message: { type: 'string' },
            details: { nullable: true },
            stack: { type: 'string', description: 'فقط در محیط development ارسال می‌شود' },
          },
        },
      },
    },
  },
  apis: [
    path.resolve(__dirname, '../../modules/auth/auth.routes.js'),
    path.resolve(__dirname, '../../modules/auth/permissions/permissions.routes.js'),
    path.resolve(__dirname, '../../modules/auth/roles/roles.routes.js'),
    path.resolve(__dirname, '../../modules/auth/users/users.routes.js'),
    path.resolve(__dirname, '../../modules/products/products.routes.js'),
    path.resolve(__dirname, '../../modules/inventory/inventory.routes.js'),
    path.resolve(__dirname, '../../modules/commercial/commercial.routes.js'),
    path.resolve(__dirname, '../../modules/commercial/partners/partners.routes.js'),
    path.resolve(__dirname, '../../modules/financial/financial.routes.js'),
    path.resolve(__dirname, '../../modules/hr/hr.routes.js'),
    path.resolve(__dirname, '../../modules/hr/hr.swagger.js'),
    path.resolve(__dirname, '../../modules/crm/crm.swagger.js'),
    path.resolve(__dirname, '../../modules/financial/payables/payables.swagger.js'),
    path.resolve(__dirname, '../../modules/domain.swagger.js'),
  ],
};

module.exports = swaggerJsdoc(options);



