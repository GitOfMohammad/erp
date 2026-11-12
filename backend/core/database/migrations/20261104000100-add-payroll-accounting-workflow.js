'use strict';

module.exports = {
  async up(q, S) {
    const optionalReference = (model) => ({
      type: S.UUID,
      allowNull: true,
      references: { model, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await q.addColumn('hr_payroll_entries', 'journal_entry_id', optionalReference('journal_entries'));
    await q.addColumn('hr_payroll_entries', 'approved_at', { type: S.DATE, allowNull: true });
    await q.addColumn('hr_payroll_entries', 'approved_by', optionalReference('users'));
    await q.addColumn('hr_payroll_entries', 'payment_journal_entry_id', optionalReference('journal_entries'));
    await q.addColumn('hr_payroll_entries', 'payment_treasury_account_id', optionalReference('treasury_accounts'));
    await q.addColumn('hr_payroll_entries', 'payment_method', { type: S.STRING(20), allowNull: true });
    await q.changeColumn('hr_payroll_entries', 'status', {
      type: S.ENUM('DRAFT', 'APPROVED', 'PAID'),
      allowNull: false,
      defaultValue: 'DRAFT',
    });
  },

  async down(q, S) {
    await q.sequelize.query("UPDATE hr_payroll_entries SET status = 'DRAFT' WHERE status = 'APPROVED'");
    await q.changeColumn('hr_payroll_entries', 'status', {
      type: S.ENUM('DRAFT', 'PAID'),
      allowNull: false,
      defaultValue: 'DRAFT',
    });
    for (const column of ['payment_method', 'payment_treasury_account_id', 'payment_journal_entry_id', 'approved_by', 'approved_at', 'journal_entry_id']) {
      await q.removeColumn('hr_payroll_entries', column);
    }
  },
};
