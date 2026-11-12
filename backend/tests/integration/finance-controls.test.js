const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../../app');
const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const env = require('../../core/config/env');
const permissionCatalog = require('../../modules/auth/permissions/permissions.catalog');
const ledger = require('../../modules/financial/gl/ledger.service');
const treasury = require('../../modules/financial/banking/treasury.service');

test('bank reconciliation matches statement movements and fiscal close posts balanced closing entry', { timeout: 60000 }, async () => {
  await sequelize.authenticate();
  const suffix = crypto.randomUUID();
  const username = `finance-controls-${suffix}`;
  const password = 'Local-finance-Password-123';
  const made = { role: null, user: null, bank: null, reconciliationId: null, fiscalYearId: null, manualEntryId: null, server: null, permissionsCreated: [] };

  try {
    const codes = ['financial.treasury.read', 'financial.reconciliation.manage', 'financial.fiscal-years.close'];
    const permissions = [];
    for (const code of codes) {
      let permission = await models.Permission.findOne({ where: { code } });
      if (!permission) {
        const definition = permissionCatalog.find(item => item.code === code);
        assert.ok(definition, `permission ${code} must exist in the catalog`);
        permission = await models.Permission.create(definition);
        made.permissionsCreated.push(permission.id);
      }
      permissions.push(permission);
    }
    made.role = await models.Role.create({ name: `Finance controls integration ${suffix}` });
    await made.role.setPermissions(permissions);
    made.user = await models.User.create({ username, passwordHash: await hashPassword(password), isactive: 1 });
    await models.UserRole.create({ user_id: made.user.id, role_id: made.role.id });

    made.bank = await treasury.createAccount({
      name: `Reconciliation bank ${suffix}`,
      accountType: 'BANK',
      bankName: 'Integration bank',
      openingBalance: '1000',
      openingDate: '2098-01-01',
    }, made.user.id);

    const treasuryMappings = await models.TreasuryAccount.findAll({ attributes: ['financial_account_id'] });
    const nonTreasuryIds = { [require('sequelize').Op.notIn]: treasuryMappings.map(row => row.financial_account_id) };
    const equity = await models.FinancialAccount.findOne({ where: { account_type: 'EQUITY', is_active: 1, is_postable: 1, id: nonTreasuryIds } });
    const revenue = await models.FinancialAccount.findOne({ where: { account_type: 'REVENUE', is_active: 1, is_postable: 1, id: nonTreasuryIds } });
    const expense = await models.FinancialAccount.findOne({ where: { account_type: 'EXPENSE', is_active: 1, is_postable: 1, id: nonTreasuryIds } });
    assert.ok(equity && revenue && expense, 'a postable equity, revenue, and expense account must exist');

    await sequelize.transaction(transaction => ledger.createPostedEntry({
      sourceType: 'FINANCE_RECONCILIATION_TEST',
      sourceId: crypto.randomUUID(),
      entryDate: '2098-02-10',
      description: 'integration bank deposit',
      createdBy: made.user.id,
      lines: [
        { accountId: made.bank.financial_account_id, treasuryAccountId: made.bank.id, debit: '200', credit: '0' },
        { accountId: equity.id, debit: '0', credit: '200' },
      ],
      transaction,
    }));

    made.manualEntryId = (await ledger.createManualEntry({
      entryDate: '2098-03-01',
      description: 'integration fiscal-year revenue and expense',
      lines: [
        { accountId: expense.id, debit: '100000', credit: '0' },
        { accountId: revenue.id, debit: '0', credit: '100000' },
      ],
    }, made.user.id)).id;

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
      assert.equal(response.status, expectStatus, `${method} ${path} returned ${response.status}: ${json.message || JSON.stringify(json)}`);
      return json.details;
    }

    const login = await request('/auth/login', { method: 'POST', body: { username, password } });
    const token = login.tokens.accessToken;
    const reconciliation = await request('/financial/bank-reconciliations', {
      method: 'POST', token,
      body: { treasuryAccountId: made.bank.id, startDate: '2098-02-01', endDate: '2098-02-28', statementOpeningBalance: '1000', statementClosingBalance: '1200' },
      expectStatus: 201,
    });
    made.reconciliationId = reconciliation.id;
    const statementLine = await request(`/financial/bank-reconciliations/${reconciliation.id}/lines`, {
      method: 'POST', token,
      body: { transactionDate: '2098-02-10', description: 'integration statement deposit', reference: 'STATEMENT-1', amount: '200' },
      expectStatus: 201,
    });
    const editedStatementLine = await request(`/financial/bank-reconciliations/${reconciliation.id}/lines/${statementLine.id}`, {
      method: 'PATCH', token,
      body: { transactionDate: '2098-02-10', description: 'corrected integration statement deposit', reference: 'STATEMENT-1', amount: '201' },
    });
    assert.equal(editedStatementLine.amount, '201');
    await request(`/financial/bank-reconciliations/${reconciliation.id}/lines/${statementLine.id}`, {
      method: 'PATCH', token,
      body: { transactionDate: '2098-02-10', description: 'integration statement deposit', reference: 'STATEMENT-1', amount: '200' },
    });
    const disposableLine = await request(`/financial/bank-reconciliations/${reconciliation.id}/lines`, {
      method: 'POST', token,
      body: { transactionDate: '2098-02-11', description: 'temporary statement row', reference: 'DELETE-ME', amount: '0' },
      expectStatus: 201,
    });
    await request(`/financial/bank-reconciliations/${reconciliation.id}/lines/${disposableLine.id}`, { method: 'DELETE', token });
    const linePage = await request(`/financial/bank-reconciliations/${reconciliation.id}/lines?page=1&limit=1`, { token });
    assert.equal(linePage.pagination.totalItems, 1);
    assert.equal(linePage.items[0].id, statementLine.id);
    const candidates = await request(`/financial/bank-reconciliations/${reconciliation.id}/candidates?lineId=${statementLine.id}`, { token });
    const candidate = candidates.items.find(line => line.amount === '200' && line.date === '2098-02-10');
    assert.ok(candidate, 'posted bank movement should be available for matching');
    await request(`/financial/bank-reconciliations/${reconciliation.id}/lines/${statementLine.id}/match`, { method: 'PUT', token, body: { journalLineId: candidate.id } });
    const finalized = await request(`/financial/bank-reconciliations/${reconciliation.id}/finalize`, { method: 'POST', token });
    assert.equal(finalized.status, 'RECONCILED');
    assert.equal(finalized.summary.difference, '0');
    assert.equal(finalized.summary.matchedCount, 1);

    const retainedEarnings = await models.FinancialAccount.findOne({
      where: {
        account_type: 'EQUITY', is_active: 1, is_postable: 1,
        id: nonTreasuryIds,
      },
    });
    assert.ok(retainedEarnings, 'a postable retained earnings account not mapped to treasury must exist');
    const closePayload = { name: `Integration fiscal year ${suffix}`, startDate: '2098-01-01', endDate: '2098-12-31', retainedEarningsAccountId: retainedEarnings.id };
    const preview = await request('/financial/gl/fiscal-years/preview-close', { method: 'POST', token, body: closePayload });
    assert.equal(preview.balanced, true);
    assert.equal(preview.netIncome, '0');
    const closed = await request('/financial/gl/fiscal-years/close', { method: 'POST', token, body: closePayload, expectStatus: 201 });
    made.fiscalYearId = closed.id;
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.totalDebit, closed.totalCredit);
    const closingEntry = await models.JournalEntry.findByPk(closed.closingJournalEntryId, { include: [{ model: models.JournalLine, as: 'lines' }] });
    assert.ok(closingEntry);
    assert.equal(closingEntry.lines.reduce((sum, line) => sum + BigInt(line.debit), 0n), BigInt(closed.totalDebit));
    assert.equal(closingEntry.lines.reduce((sum, line) => sum + BigInt(line.credit), 0n), BigInt(closed.totalCredit));
    await assert.rejects(
      ledger.createManualEntry({ entryDate: '2098-06-01', description: 'must be blocked in closed period', lines: [{ accountId: expense.id, debit: '100', credit: '0' }, { accountId: revenue.id, debit: '0', credit: '100' }] }, made.user.id),
      error => error.statusCode === 409,
    );
  } finally {
    if (made.server) await new Promise(resolve => made.server.close(resolve));
    if (made.reconciliationId) {
      await models.BankReconciliationLine.destroy({ where: { reconciliation_id: made.reconciliationId } });
      await models.BankReconciliation.destroy({ where: { id: made.reconciliationId } });
    }
    if (made.fiscalYearId) await models.FiscalYear.destroy({ where: { id: made.fiscalYearId } });
    if (made.user) {
      const entries = await models.JournalEntry.findAll({ where: { created_by: made.user.id }, attributes: ['id'] });
      const entryIds = entries.map(entry => entry.id);
      if (entryIds.length) {
        await models.JournalLine.destroy({ where: { journal_entry_id: entryIds } });
        await models.JournalEntry.destroy({ where: { id: entryIds } });
      }
    }
    if (made.bank) {
      await models.TreasuryAccount.destroy({ where: { id: made.bank.id } });
      if (made.bank.financial_account_id) await models.FinancialAccount.destroy({ where: { id: made.bank.financial_account_id } });
    }
    if (made.user) {
      await models.RefreshSession.destroy({ where: { user_id: made.user.id } });
      await models.UserRole.destroy({ where: { user_id: made.user.id } });
    }
    if (made.role) {
      await models.RolePermission.destroy({ where: { role_id: made.role.id } });
      await made.role.destroy();
    }
    if (made.permissionsCreated.length) await models.Permission.destroy({ where: { id: made.permissionsCreated } });
    if (made.user) await made.user.destroy();
    await sequelize.close();
  }
});
