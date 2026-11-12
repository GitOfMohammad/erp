const { sequelize } = require('../db');
const { Permission, Role, RolePermission } = require('../models');
const permissionCatalog = require('../../../modules/auth/permissions/permissions.catalog');

module.exports = {
  async up() {
    await sequelize.transaction(async (transaction) => {
      for (const definition of permissionCatalog) {
        const [permission, created] = await Permission.findOrCreate({
          where: { code: definition.code },
          defaults: definition,
          transaction,
        });

        if (!created) {
          await permission.update({
            name: definition.name,
            description: definition.description,
          }, { transaction });
        }
      }

      // Ensure the existing site admin can manage commercial documents and approve invoices/returns.
      const siteAdminRole = await Role.findOne({
        where: { name: 'مدیر سایت' },
        transaction,
      });
      const administratorCodes = [
        'settings.general.read',
        'settings.general.update',
        'settings.tax.read',
        'settings.tax.update',
        'settings.finance.read',
        'settings.finance.update',
        'settings.inventory.read',
        'settings.inventory.update',
        'settings.security.read',
        'settings.security.update',
        'inventory.counts.approve',
        'users.role.update',
        'commercial.partners.read',
        'commercial.partners.manage',
        'purchasing.orders.update',
        'purchasing.orders.cancel',
        'sales.orders.update',
        'sales.orders.cancel',
        'purchasing.invoices.settle',
        'sales.invoices.settle',
        'commercial.finance.read',
        'financial.treasury.read',
        'financial.treasury.manage',
        'financial.payables.read',
        'financial.payables.settle',
        'financial.payables.reverse',
        'financial.treasury.transfer',
        'financial.cash-vouchers.read',
        'financial.cash-vouchers.create',
        'financial.cash-vouchers.reverse',
        'financial.gl.read',
        'financial.gl.accounts.manage',
        'financial.gl.journals.create',
        'financial.gl.journals.reverse',
        'financial.reports.read',
        'financial.fiscal-years.close',
        'financial.reconciliation.manage',
        'purchasing.orders.read',
        'purchasing.orders.create',
        'purchasing.invoices.read',
        'purchasing.invoices.create',
        'purchasing.invoices.update',
        'purchasing.invoices.approve',
        'purchasing.returns.read',
        'purchasing.returns.create',
        'purchasing.returns.update',
        'purchasing.returns.approve',
        'sales.orders.read',
        'sales.orders.create',
        'sales.invoices.read',
        'sales.invoices.create',
        'sales.invoices.update',
        'sales.invoices.approve',
        'sales.returns.read',
        'sales.returns.create',
        'sales.returns.update',
        'sales.returns.approve',
        'sales.representatives.read',
        'sales.representatives.manage',
        'hr.employees.read',
        'hr.employees.manage',
        'hr.organization.manage',
        'hr.shifts.read',
        'hr.shifts.manage',
        'hr.attendance.read',
        'hr.attendance.manage',
        'hr.attendance.self',
        'hr.leaves.read',
        'hr.leaves.request',
        'hr.leaves.review',
        'hr.payroll.read',
        'hr.payroll.manage',
        'hr.payroll.approve',
        'hr.payroll.pay',
        'hr.performance.read',
        'hr.performance.manage',
        'hr.training.read',
        'hr.training.manage',
        'crm.leads.read',
        'crm.leads.create',
        'crm.leads.update',
        'crm.leads.convert',
        'crm.interactions.read',
        'crm.interactions.create',
        'crm.support.read',
        'crm.support.create',
        'crm.support.manage',
        'crm.contracts.read',
        'crm.contracts.create',
        'crm.contracts.manage',
        'production.boms.read',
        'production.boms.create',
        'production.boms.update',
        'production.boms.delete',
        'production.boms.activate',
        'production.boms.archive',
        'production.orders.read',
        'production.orders.create',
        'production.orders.update',
        'production.orders.delete',
        'production.orders.release',
        'production.orders.complete',
        'production.orders.cost',
        'production.orders.cancel',
        'production.quality.read',
        'production.quality.create',
        'production.quality.update',
        'production.quality.delete',
        'financial.assets.read',
        'financial.assets.create',
        'financial.assets.update',
        'financial.assets.delete',
        'financial.assets.depreciate',
        'financial.assets.dispose',
        'financial.budgets.read',
        'financial.budgets.create',
        'financial.budgets.update',
        'financial.budgets.delete',
        'financial.budgets.approve',
        'financial.budgets.close',
        'project.projects.read',
        'project.projects.create',
        'project.projects.update',
        'project.projects.delete',
        'project.projects.start',
        'project.projects.hold',
        'project.projects.resume',
        'project.projects.complete',
        'project.tasks.read',
        'project.tasks.create',
        'project.tasks.update',
        'project.tasks.delete',
        'project.tasks.start',
        'project.tasks.block',
        'project.tasks.complete',
        'project.expenses.read',
        'project.expenses.create',
        'project.expenses.update',
        'project.expenses.delete',
        'project.expenses.approve',
        'project.expenses.reject',
        'project.expenses.reject',
        'scm.shipments.read',
        'scm.shipments.create',
        'scm.shipments.update',
        'scm.shipments.delete',
        'scm.shipments.pickup',
        'scm.shipments.transit',
        'scm.shipments.deliver',
        'scm.shipments.exception',
        'scm.shipments.cancel',
        'scm.vendors.read',
        'scm.vendors.create',
        'scm.vendors.update',
        'scm.vendors.delete',
      ];
      if (siteAdminRole) {
        const administratorPermissions = await Permission.findAll({
          where: { code: administratorCodes },
          transaction,
        });
        await siteAdminRole.addPermissions(administratorPermissions, { transaction });
      }
    });
  },

  async down() {
    await sequelize.transaction(async (transaction) => {
      const codes = permissionCatalog.map(({ code }) => code);
      const permissions = await Permission.findAll({
        where: { code: codes },
        attributes: ['id', 'code'],
        transaction,
      });
      const ids = permissions.map(({ id }) => id);

      if (ids.length > 0) {
        const assignedPermission = await RolePermission.findOne({
          where: { permission_id: ids },
          transaction,
        });
        if (assignedPermission) {
          throw new Error('Cannot undo permission seed while catalog permissions are assigned to roles.');
        }
      }

      await Permission.destroy({ where: { code: codes }, transaction });
    });
  },
};





