const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../../app');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const env = require('../../core/config/env');
const treasury = require('../../modules/financial/banking/treasury.service');

test('payroll approval accrues gross pay and recording external payment settles net pay only', { timeout: 60000 }, async () => {
  await sequelize.authenticate();
  const suffix = crypto.randomUUID();
  const username = `payroll-${suffix}`;
  const password = 'Local-payroll-Password-123';
  const period = '1475-01';
  const periodStartDate = '2096-03-20';
  const made = { role: null, user: null, employee: null, account: null, server: null, payrollId: null };

  try {
    const permissionCodes = ['hr.payroll.read', 'hr.payroll.manage', 'hr.payroll.approve', 'hr.payroll.pay'];
    const permissions = await models.Permission.findAll({ where: { code: permissionCodes } });
    assert.equal(permissions.length, permissionCodes.length, 'payroll permissions must be seeded before integration tests');
    made.role = await models.Role.create({ name: `Payroll integration ${suffix}` });
    await made.role.setPermissions(permissions);
    made.user = await models.User.create({ username, passwordHash: await hashPassword(password), isactive: 1 });
    await models.UserRole.create({ user_id: made.user.id, role_id: made.role.id });
    made.employee = await models.Employee.create({
      employee_number: `PI-${suffix}`,
      first_name: 'Test',
      last_name: 'Employee',
      hire_date: '2026-01-01',
      employment_status: 'ACTIVE',
    });
    made.account = await treasury.createAccount({
      name: `Payroll integration bank ${suffix}`,
      accountType: 'BANK',
      bankName: 'Integration bank',
      openingBalance: '1000000',
      openingDate: '2096-03-01',
    }, made.user.id);

    made.server = app.listen(0);
    await new Promise((resolve, reject) => { made.server.once('listening', resolve); made.server.once('error', reject); });
    const baseUrl = `http://127.0.0.1:${made.server.address().port}${env.api.prefix}`;
    async function request(path, { method = 'GET', body, token, expectStatus = 200 } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await response.json();
      assert.equal(response.status, expectStatus, `${method} ${path} returned ${response.status}: ${json.message || JSON.stringify(json)}${json.stack ? `\n${json.stack}` : ''}`);
      return json.details;
    }

    const login = await request('/auth/login', { method: 'POST', body: { username, password } });
    const token = login.tokens.accessToken;
    const draft = await request('/hr/payroll', {
      method: 'POST', token,
      body: { employeeId: made.employee.id, period, periodStartDate, baseAmount: 200000, allowanceAmount: 20000, deductionAmount: 20000, note: 'integration payroll' },
      expectStatus: 201,
    });
    made.payrollId = draft.id;
    assert.equal(String(draft.net_amount), '200000');
    assert.equal(draft.period_jalali, period);
    assert.equal(draft.period_start_date, periodStartDate);

    const updated = await request(`/hr/payroll/${draft.id}`, {
      method: 'PATCH', token,
      body: { baseAmount: 210000, allowanceAmount: 20000, deductionAmount: 30000 },
    });
    assert.equal(String(updated.net_amount), '200000', 'editing a draft recalculates its net amount under a row lock');

    const approved = await request(`/hr/payroll/${draft.id}/approve`, { method: 'PATCH', token });
    assert.equal(approved.status, 'APPROVED');
    assert.ok(approved.journal_entry_id);
    const accrualLines = await models.JournalLine.findAll({ where: { journal_entry_id: approved.journal_entry_id } });
    assert.equal(accrualLines.reduce((sum, line) => sum + BigInt(line.debit), 0n), 230000n, 'gross salary is expensed');
    assert.equal(accrualLines.reduce((sum, line) => sum + BigInt(line.credit), 0n), 230000n, 'net salary and deductions are separate liabilities');
    const accrualEntry = await models.JournalEntry.findByPk(approved.journal_entry_id);
    assert.equal(String(accrualEntry.entry_date), periodStartDate, 'accrual is posted on the first Gregorian date of the selected Jalali month');
    await request(`/hr/payroll/${draft.id}`, { method: 'PATCH', token, body: { baseAmount: 210000 }, expectStatus: 409 });

    await request(`/hr/payroll/${draft.id}/pay`, {
      method: 'PATCH', token,
      body: { treasuryAccountId: made.account.id, method: 'BANK_TRANSFER', entryDate: '2096-03-10' },
      expectStatus: 400,
    });

    const paid = await request(`/hr/payroll/${draft.id}/pay`, {
      method: 'PATCH', token,
      body: { treasuryAccountId: made.account.id, method: 'BANK_TRANSFER', entryDate: '2096-03-21', reference: 'PAYROLL-TEST' },
    });
    assert.equal(paid.status, 'PAID');
    assert.equal(paid.payment_reference, 'PAYROLL-TEST');
    assert.equal(await treasury.balance(made.account.id), 800000n);
    const paymentLines = await models.JournalLine.findAll({ where: { journal_entry_id: paid.payment_journal_entry_id } });
    assert.equal(paymentLines.reduce((sum, line) => sum + BigInt(line.debit), 0n), 200000n);
    assert.equal(paymentLines.reduce((sum, line) => sum + BigInt(line.credit), 0n), 200000n);

    await request(`/hr/payroll/${draft.id}/pay`, {
      method: 'PATCH', token,
      body: { treasuryAccountId: made.account.id, method: 'BANK_TRANSFER', entryDate: '2096-03-22' },
      expectStatus: 409,
    });
  } finally {
    if (made.server) await new Promise(resolve => made.server.close(resolve));
    if (made.payrollId) await models.PayrollEntry.destroy({ where: { id: made.payrollId } });
    if (made.user) {
      const entries = await models.JournalEntry.findAll({ where: { created_by: made.user.id }, attributes: ['id'] });
      const entryIds = entries.map(entry => entry.id);
      if (entryIds.length) {
        await models.JournalLine.destroy({ where: { journal_entry_id: entryIds } });
        await models.JournalEntry.destroy({ where: { id: entryIds } });
      }
    }
    if (made.account) {
      await models.TreasuryAccount.destroy({ where: { id: made.account.id } });
      if (made.account.financial_account_id) await models.FinancialAccount.destroy({ where: { id: made.account.financial_account_id } });
    }
    if (made.employee) await models.Employee.destroy({ where: { id: made.employee.id } });
    if (made.user) {
      await models.RefreshSession.destroy({ where: { user_id: made.user.id } });
      await models.UserRole.destroy({ where: { user_id: made.user.id } });
    }
    if (made.role) {
      await models.RolePermission.destroy({ where: { role_id: made.role.id } });
      await made.role.destroy();
    }
    if (made.user) await made.user.destroy();
    await sequelize.close();
  }
});
