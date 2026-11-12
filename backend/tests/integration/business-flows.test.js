const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { sequelize } = require('../../core/database/db');
const models = require('../../core/database/models');
const { hashPassword } = require('../../core/utils/bcrypt');
const commercial = require('../../modules/commercial/commercial.service');
const inventory = require('../../modules/inventory/inventory.service');
const treasuryService = require('../../modules/financial/banking/treasury.service');
const ledger = require('../../modules/financial/gl/ledger.service');
const cashVouchers = require('../../modules/financial/cash-vouchers/cash-vouchers.service');
const ErrorApi = require('../../core/api/ErrorApi');
const jsonValue = (value) => {
  let parsed = value;
  for (let attempt = 0; attempt < 5 && typeof parsed === 'string'; attempt += 1) {
    try { parsed = JSON.parse(parsed); } catch { return parsed; }
  }
  return parsed;
};

test('commercial, inventory, treasury, journal, and cheque register flows preserve balances and pagination', { timeout: 60000 }, async () => {
  await sequelize.authenticate();

  for (const direction of ['RECEIPT', 'PAYMENT']) {
    const register = await cashVouchers.listChequeRegister({ direction, page: 1, limit: 20 });
    assert.ok(register.items.length <= 20);
    assert.equal(register.pagination.page, 1);
    assert.equal(register.pagination.limit, 20);
    assert.ok(Number.isInteger(register.pagination.totalItems));
    assert.ok(Number.isInteger(register.pagination.totalPages));
    assert.match(register.pagination.totalAmount, /^\d+$/);
    assert.ok(register.pagination.statusCounts && typeof register.pagination.statusCounts === 'object');
  }

  const customerChequePage = await cashVouchers.listCustomerCheques({ status: 'ALL', search: '', page: 1, limit: 1 });
  assert.ok(customerChequePage.items.length <= 1);
  assert.equal(customerChequePage.pagination.page, 1);
  assert.equal(customerChequePage.pagination.limit, 1);
  assert.ok(Number.isInteger(customerChequePage.pagination.totalItems));
  assert.ok(Number.isInteger(customerChequePage.pagination.totalPages));
  const companyCheckbookPage = await cashVouchers.listCompanyCheckbooks({ page: 1, limit: 1 });
  assert.ok(companyCheckbookPage.items.length <= 1);
  assert.equal(companyCheckbookPage.pagination.page, 1);
  assert.equal(companyCheckbookPage.pagination.limit, 1);
  assert.ok(Number.isInteger(companyCheckbookPage.pagination.totalItems));
  assert.ok(Number.isInteger(companyCheckbookPage.pagination.totalPages));

  const suffix = crypto.randomUUID();
  const made = { documents: [], treasury: null, financialAccount: null, warehouses: [], product: null, partner: null, user: null, inventorySetting: null, inventorySettingChanged: false, financeSetting: null, financeSettingChanged: false };
  let cleanupError;

  try {
    const passwordHash = await hashPassword('Integration-only-password-123');
    made.user = await models.User.create({
      username: 'business-flow-' + suffix,
      passwordHash,
      isactive: 1,
    });
    made.partner = await models.CommercialPartner.create({
      code: 'T-' + suffix.slice(0, 30),
      name: 'Integration partner',
      partner_type: 'BOTH',
      is_active: 1,
    });
    made.product = await models.Product.create({
      code: 'T-' + suffix,
      name: 'Integration product',
      unit: 'piece',
      reorder_point: 0,
      is_active: 1,
    });
    const sourceWarehouse = await models.Warehouse.create({
      code: 'T-S-' + suffix.slice(0, 30),
      name: 'Integration source',
      is_active: 1,
    });
    const destinationWarehouse = await models.Warehouse.create({
      code: 'T-D-' + suffix.slice(0, 30),
      name: 'Integration destination',
      is_active: 1,
    });
    made.warehouses.push(sourceWarehouse, destinationWarehouse);

    const financeSettings = await models.FinanceSetting.findByPk(1);
    const financeSnapshot = financeSettings?.get({ plain: true }) || null;
    made.financeSetting = financeSnapshot ? { ...financeSnapshot, enabledCurrencies: jsonValue(financeSnapshot.enabledCurrencies) } : null;
    await models.FinanceSetting.upsert({ id: 1, enabledCurrencies: ['USD'] });
    made.financeSettingChanged = true;
    const testCurrency = 'USD';
    const testRate = '12000';
    await assert.rejects(commercial.create('PURCHASE_ORDER', {
      partnerId: made.partner.id,
      currency: 'EUR',
      exchangeRate: testRate,
      items: [{ productId: made.product.id, quantity: 2, unitPrice: 25 }],
    }, made.user.id), error => error instanceof ErrorApi && error.statusCode === 400);
    const foreignCurrencyOrder = await commercial.create('PURCHASE_ORDER', {
      partnerId: made.partner.id,
      dueDate: '2026-12-15',
      currency: testCurrency,
      exchangeRate: testRate,
      items: [{ productId: made.product.id, quantity: 2, unitPrice: 25 }],
      note: 'integration foreign-currency order',
    }, made.user.id);
    made.documents.push(foreignCurrencyOrder);
    assert.equal(foreignCurrencyOrder.currency, testCurrency);
    assert.equal(String(foreignCurrencyOrder.exchange_rate), testRate);
    assert.equal(String(foreignCurrencyOrder.due_date).slice(0, 10), '2026-12-15');
    const transactionAmounts = jsonValue(foreignCurrencyOrder.transaction_amounts);
    assert.equal(transactionAmounts.currency, testCurrency);
    assert.equal(transactionAmounts.exchange_rate, testRate);
    assert.equal(String(foreignCurrencyOrder.total_amount), '600000', 'the stored accounting total is converted to the IRR base currency');
    const foreignOrderLine = await models.CommercialDocumentItem.findOne({ where: { document_id: foreignCurrencyOrder.id } });
    assert.equal(jsonValue(foreignOrderLine.transaction_amounts).unit_price, '25', 'the original foreign-currency unit price is preserved for presentation');
    assert.equal(String(foreignOrderLine.unit_price), '300000', 'the stored unit price is converted to the IRR base currency');

    made.inventorySetting = await models.InventorySetting.findByPk(1);
    const [inventoryAccount, stockGainAccount, stockLossAccount] = await Promise.all([
      models.FinancialAccount.findOne({ where: { code: '1200' } }),
      models.FinancialAccount.findOne({ where: { code: '4000' } }),
      models.FinancialAccount.findOne({ where: { code: '5300' } }),
    ]);
    assert.ok(inventoryAccount && stockGainAccount && stockLossAccount);
    await models.InventorySetting.upsert({
      id: 1,
      inventoryAccountId: inventoryAccount.id,
      stockGainAccountId: stockGainAccount.id,
      stockLossAccountId: stockLossAccount.id,
      requireCountApproval: true,
    });
    made.inventorySettingChanged = true;

    made.treasury = await treasuryService.createAccount({
      code: 'T-' + suffix.slice(0, 25),
      name: 'Integration cash',
      accountType: 'CASH',
      openingBalance: '50000',
      openingDate: new Date().toISOString().slice(0, 10),
    }, made.user.id);
    made.financialAccount = made.treasury.financialAccount;

    const purchase = await commercial.create('PURCHASE_INVOICE', {
      partnerId: made.partner.id,
      warehouseId: sourceWarehouse.id,
      items: [{ productId: made.product.id, quantity: 10, unitPrice: 100 }],
      note: 'integration purchase',
    }, made.user.id);
    made.documents.push(purchase);
    assert.equal(purchase.status, 'PENDING_APPROVAL');

    const approvedPurchase = await commercial.approve(purchase.id, 'APPROVE', made.user.id);
    assert.equal(approvedPurchase.status, 'APPROVED');
    let balance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: sourceWarehouse.id },
    });
    assert.equal(Number(balance.quantity), 10);
    assert.equal(Number(balance.avg_unit_cost), 100);

    const paid = await commercial.addSettlement('PURCHASE_INVOICE', purchase.id, {
      action: 'SETTLE',
      treasuryAccountId: made.treasury.id,
      amount: '400',
      method: 'CASH',
    }, made.user.id);
    assert.equal(paid.document.financial.paid_amount, '400');
    assert.equal(await treasuryService.balance(made.treasury.id), 49600n);

    await commercial.reverseSettlement('PURCHASE_INVOICE', purchase.id, paid.settlement.id, {
      reason: 'integration reversal',
    }, made.user.id);
    assert.equal(await treasuryService.balance(made.treasury.id), 50000n);

    const purchaseReturn = await commercial.create('PURCHASE_RETURN', {
      partnerId: made.partner.id,
      warehouseId: sourceWarehouse.id,
      relatedDocumentId: purchase.id,
      items: [{ productId: made.product.id, quantity: 2, unitPrice: 100, discountPercent: 0, discountAmount: 0, taxPercent: 0 }],
      note: 'integration purchase return',
    }, made.user.id);
    made.documents.push(purchaseReturn);
    await commercial.approve(purchaseReturn.id, 'APPROVE', made.user.id);
    const payableBalances = await commercial.financialBalances({ direction: 'PAYABLE', page: 1, limit: 100 });
    const integrationPayable = payableBalances.items.find(item => item.partner.id === made.partner.id);
    assert.ok(integrationPayable, 'paginated payable balances include the integration supplier');
    assert.equal(integrationPayable.balanceDue, '800', 'approved purchase returns reduce the supplier balance');
    assert.equal(integrationPayable.creditBalance, '0');
    assert.equal(payableBalances.pagination.limit, 100);
    assert.ok(payableBalances.items.length <= payableBalances.pagination.limit);
    balance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: sourceWarehouse.id },
    });
    assert.equal(Number(balance.quantity), 8);

    const sale = await commercial.create('SALES_INVOICE', {
      partnerId: made.partner.id,
      warehouseId: sourceWarehouse.id,
      items: [{ productId: made.product.id, quantity: 3, unitPrice: 250 }],
      note: 'integration sale',
    }, made.user.id);
    made.documents.push(sale);
    await commercial.approve(sale.id, 'APPROVE', made.user.id);
    balance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: sourceWarehouse.id },
    });
    assert.equal(Number(balance.quantity), 5);

    const received = await commercial.addSettlement('SALES_INVOICE', sale.id, {
      action: 'SETTLE',
      treasuryAccountId: made.treasury.id,
      amount: '300',
      method: 'CASH',
    }, made.user.id);
    assert.equal(received.document.financial.paid_amount, '300');
    assert.equal(await treasuryService.balance(made.treasury.id), 50300n);

    const saleReturn = await commercial.create('SALES_RETURN', {
      partnerId: made.partner.id,
      warehouseId: sourceWarehouse.id,
      relatedDocumentId: sale.id,
      items: [{ productId: made.product.id, quantity: 1, unitPrice: 250, discountPercent: 0, discountAmount: 0, taxPercent: 0 }],
      note: 'integration sales return',
    }, made.user.id);
    made.documents.push(saleReturn);
    await commercial.approve(saleReturn.id, 'APPROVE', made.user.id);
    const receivableBalances = await commercial.financialBalances({ direction: 'RECEIVABLE', page: 1, limit: 100 });
    const integrationReceivable = receivableBalances.items.find(item => item.partner.id === made.partner.id);
    assert.ok(integrationReceivable, 'paginated receivable balances include the integration customer');
    assert.equal(integrationReceivable.balanceDue, '200', 'approved sales returns reduce the customer balance');
    assert.equal(integrationReceivable.creditBalance, '0');
    balance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: sourceWarehouse.id },
    });
    assert.equal(Number(balance.quantity), 6);

    await assert.rejects(
      inventory.createMovement({
        productId: made.product.id,
        warehouseId: sourceWarehouse.id,
        movementType: 'OUT',
        quantity: 7,
      }, made.user.id),
      (error) => error instanceof ErrorApi && error.statusCode === 409,
    );
    balance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: sourceWarehouse.id },
    });
    assert.equal(Number(balance.quantity), 6);

    await inventory.createMovement({
      productId: made.product.id,
      warehouseId: sourceWarehouse.id,
      movementType: 'IN',
      quantity: 4,
      unitCost: 100,
      note: 'integration stock receipt',
    }, made.user.id);
    await inventory.createTransfer({
      sourceWarehouseId: sourceWarehouse.id,
      destinationWarehouseId: destinationWarehouse.id,
      items: [{ productId: made.product.id, quantity: 3 }],
      note: 'integration transfer',
    }, made.user.id);

    const sourceBalance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: sourceWarehouse.id },
    });
    const destinationBalance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: destinationWarehouse.id },
    });
    assert.equal(Number(sourceBalance.quantity), 7);
    assert.equal(Number(destinationBalance.quantity), 3);

    await inventory.createCount({
      warehouseId: destinationWarehouse.id,
      items: [{ productId: made.product.id, countedQuantity: 4 }],
      note: 'integration stock count',
    }, made.user.id);
    let countedBalance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: destinationWarehouse.id },
    });
    assert.equal(Number(countedBalance.quantity), 3);
    const pendingCount = await models.StockCount.findOne({ where: { counted_by: made.user.id, status: 'PENDING_APPROVAL' } });
    assert.ok(pendingCount);
    await inventory.approveCount(pendingCount.id, made.user.id);
    countedBalance = await models.StockBalance.findOne({
      where: { product_id: made.product.id, warehouse_id: destinationWarehouse.id },
    });
    assert.equal(Number(countedBalance.quantity), 4);

    const [expense, revenue] = await Promise.all([
      models.FinancialAccount.findOne({ where: { code: '5000' } }),
      models.FinancialAccount.findOne({ where: { code: '4000' } }),
    ]);
    assert.ok(expense);
    assert.ok(revenue);
    const manualEntry = await ledger.createManualEntry({
      entryDate: new Date().toISOString().slice(0, 10),
      description: 'integration manual journal',
      lines: [
        { accountId: expense.id, debit: '250', credit: '0' },
        { accountId: revenue.id, debit: '0', credit: '250' },
      ],
    }, made.user.id);
    const reversal = await ledger.reverseEntry(manualEntry.id, {
      entryDate: new Date().toISOString().slice(0, 10),
      description: 'integration journal reversal',
    }, made.user.id);
    assert.equal(reversal.source_type, 'REVERSAL');
    await assert.rejects(
      ledger.reverseEntry(manualEntry.id, {
        entryDate: new Date().toISOString().slice(0, 10),
        description: 'duplicate integration reversal',
      }, made.user.id),
      (error) => error instanceof ErrorApi && error.statusCode === 409,
    );

    const trialBalance = await ledger.trialBalance({ asOf: new Date().toISOString().slice(0, 10) });
    assert.equal(trialBalance.balanced, true);
    assert.equal(trialBalance.totalDebit, trialBalance.totalCredit);
  } finally {
    try {
      if (made.user) {
        const docIds = made.documents.map((doc) => doc.id);
        if (docIds.length) {
          const Op = require('sequelize').Op;
          await models.CommercialSettlement.destroy({
            where: { document_id: docIds, reverses_settlement_id: { [Op.ne]: null } },
          });
          await models.CommercialSettlement.destroy({ where: { document_id: docIds } });

          const returns = made.documents.filter((doc) => doc.document_type.endsWith('RETURN')).map((doc) => doc.id);
          if (returns.length) {
            await models.CommercialDocumentItem.destroy({ where: { document_id: returns } });
            await models.CommercialDocument.destroy({ where: { id: returns } });
          }
          const invoices = made.documents.filter((doc) => !doc.document_type.endsWith('RETURN')).map((doc) => doc.id);
          if (invoices.length) {
            await models.CommercialDocumentItem.destroy({ where: { document_id: invoices } });
            await models.CommercialDocument.destroy({ where: { id: invoices } });
          }
        }

        const counts = await models.StockCount.findAll({ where: { counted_by: made.user.id }, attributes: ['id'] });
        const countIds = counts.map((row) => row.id);
        if (countIds.length) {
          await models.StockCountItem.destroy({ where: { count_id: countIds } });
          await models.StockCount.destroy({ where: { id: countIds } });
        }

        const transfers = await models.StockTransfer.findAll({ where: { created_by: made.user.id }, attributes: ['id'] });
        const transferIds = transfers.map((row) => row.id);
        if (transferIds.length) {
          await models.StockTransferItem.destroy({ where: { transfer_id: transferIds } });
          await models.StockTransfer.destroy({ where: { id: transferIds } });
        }

        await models.StockMovement.destroy({ where: { created_by: made.user.id } });
        if (made.product) await models.StockBalance.destroy({ where: { product_id: made.product.id } });

        const entries = await models.JournalEntry.findAll({ where: { created_by: made.user.id }, attributes: ['id'] });
        const entryIds = entries.map((row) => row.id);
        if (entryIds.length) {
          await models.JournalLine.destroy({ where: { journal_entry_id: entryIds } });
          await models.JournalEntry.destroy({ where: { id: entryIds } });
        }

        if (made.treasury) await models.TreasuryAccount.destroy({ where: { id: made.treasury.id } });
        if (made.financialAccount) await models.FinancialAccount.destroy({ where: { id: made.financialAccount.id } });
        if (made.product) await models.Product.destroy({ where: { id: made.product.id }, force: true });
        if (made.warehouses.length) await models.Warehouse.destroy({ where: { id: made.warehouses.map((row) => row.id) } });
        if (made.partner) await models.CommercialPartner.destroy({ where: { id: made.partner.id }, force: true });
        await models.User.destroy({ where: { id: made.user.id } });
      }
      if (made.inventorySettingChanged) {
        if (made.inventorySetting) await made.inventorySetting.update(made.inventorySetting.get({ plain: true }));
        else await models.InventorySetting.destroy({ where: { id: 1 } });
      }
      if (made.financeSettingChanged) {
        if (made.financeSetting) await models.FinanceSetting.upsert(made.financeSetting);
        else await models.FinanceSetting.destroy({ where: { id: 1 } });
      }
    } catch (error) {
      cleanupError = error;
    } finally {
      await sequelize.close();
    }
    if (cleanupError) throw cleanupError;
  }
});
