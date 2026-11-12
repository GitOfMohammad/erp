const { Router } = require('express');
const router = Router();

router.use('/auth', require('./auth/auth.routes'));
router.use('/permissions', require('./auth/permissions/permissions.routes'));
router.use('/roles', require('./auth/roles/roles.routes'));
router.use('/users', require('./auth/users/users.routes'));
router.use('/products', require('./products/products.routes'));
router.use('/inventory', require('./inventory/inventory.routes'));
router.use('/commercial', require('./commercial/commercial.routes'));
router.use('/financial', require('./financial/financial.routes'));
router.use('/hr', require('./hr/hr.routes'));
router.use('/crm', require('./crm/crm.routes'));
router.use('/production', require('./production/production.routes'));
router.use('/financial/assets', require('./assets/assets.routes'));
router.use('/financial/budgets', require('./budgeting/budgeting.routes'));
router.use('/projects', require('./project/project.routes'));
router.use('/scm', require('./scm/scm.routes'));
router.use('/settings', require('./settings/settings.routes'));

module.exports = router;


