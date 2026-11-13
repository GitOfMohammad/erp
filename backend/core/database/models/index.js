const { sequelize } = require('../db');

//! Model imports
const User = require('../../../modules/auth/users/user.model')(sequelize);
const CompanySetting = require('../../../modules/settings/company-setting.model')(sequelize);
const TaxSetting = require('../../../modules/settings/tax-setting.model')(sequelize);
const FinanceSetting = require('../../../modules/settings/finance-setting.model')(sequelize);
const InventorySetting = require('../../../modules/settings/inventory-setting.model')(sequelize);
const SecuritySetting = require('../../../modules/settings/security-setting.model')(sequelize);
const PrintSetting = require('../../../modules/settings/print-setting.model')(sequelize);
const MoadianSetting = require('../../../modules/settings/moadian-setting.model')(sequelize);
const SecurityEvent = require('../../../modules/auth/security-event.model')(sequelize);
const SystemLog = require('../../../modules/monitoring/system-log.model')(sequelize);
const Role = require('../../../modules/auth/roles/role.model')(sequelize);
const Permission = require('../../../modules/auth/permissions/permission.model')(sequelize);
const UserRole = require('../../../modules/auth/user-roles/user-role.model')(sequelize);
const RolePermission = require('../../../modules/auth/role-permissions/role-permission.model')(sequelize);
const RefreshSession = require('../../../modules/auth/refresh-sessions/refresh-session.model')(sequelize);
const Product = require('../../../modules/products/product.model')(sequelize);
const Category = require('../../../modules/products/category.model')(sequelize);
const ProductCategory = require('../../../modules/products/product-category.model')(sequelize);
const ProductImage = require('../../../modules/products/product-image.model')(sequelize);
const Warehouse = require('../../../modules/inventory/warehouses/warehouse.model')(sequelize);
const StockBalance = require('../../../modules/inventory/stock/stock-balance.model')(sequelize);
const StockMovement = require('../../../modules/inventory/movements/stock-movement.model')(sequelize);
const StockTransfer = require('../../../modules/inventory/transfers/stock-transfer.model')(sequelize);
const StockTransferItem = require('../../../modules/inventory/transfers/stock-transfer-item.model')(sequelize);
const StockCount = require('../../../modules/inventory/counting/stock-count.model')(sequelize);
const StockCountItem = require('../../../modules/inventory/counting/stock-count-item.model')(sequelize);
const CommercialDocument = require('../../../modules/commercial/commercial-document.model')(sequelize);
const CommercialDocumentItem = require('../../../modules/commercial/commercial-document-item.model')(sequelize);
const CommercialPartner = require('../../../modules/commercial/partners/partner.model')(sequelize);
const CommercialSettlement = require('../../../modules/commercial/settlements/commercial-settlement.model')(sequelize);
const SalesRepresentative = require('../../../modules/commercial/sales-representative.model')(sequelize);
const PayableSettlement = require('../../../modules/financial/payables/payable-settlement.model')(sequelize);
const FinancialAccount = require('../../../modules/financial/gl/financial-account.model')(sequelize);
const JournalEntry = require('../../../modules/financial/gl/journal-entry.model')(sequelize);
const JournalLine = require('../../../modules/financial/gl/journal-line.model')(sequelize);
const FiscalYear = require('../../../modules/financial/gl/fiscal-year.model')(sequelize);
const { BankReconciliation, BankReconciliationLine } = require('../../../modules/financial/banking/bank-reconciliation.model')(sequelize);
const TreasuryAccount = require('../../../modules/financial/banking/treasury-account.model')(sequelize);
const TreasuryTransfer = require('../../../modules/financial/banking/treasury-transfer.model')(sequelize);
const CashVoucher = require('../../../modules/financial/cash-vouchers/cash-voucher.model')(sequelize);
const CustomerCheque = require('../../../modules/financial/cash-vouchers/customer-cheque.model')(sequelize);
const CompanyCheckbook = require('../../../modules/financial/cash-vouchers/company-checkbook.model')(sequelize);
const CompanyCheque = require('../../../modules/financial/cash-vouchers/company-cheque.model')(sequelize);
const DirectPartnerSettlement = require('../../../modules/financial/cash-vouchers/direct-partner-settlement.model')(sequelize);
const DirectPartnerSettlementAllocation = require('../../../modules/financial/cash-vouchers/direct-partner-settlement-allocation.model')(sequelize);
const Department = require('../../../modules/hr/personnel/department.model')(sequelize);
const Position = require('../../../modules/hr/personnel/position.model')(sequelize);
const Employee = require('../../../modules/hr/personnel/employee.model')(sequelize);
const HrShift = require('../../../modules/hr/attendance/shift.model')(sequelize);
const ShiftAssignment = require('../../../modules/hr/attendance/shift-assignment.model')(sequelize);
const AttendanceRecord = require('../../../modules/hr/attendance/attendance-record.model')(sequelize);
const LeaveRequest = require('../../../modules/hr/attendance/leave-request.model')(sequelize);
const PayrollEntry = require('../../../modules/hr/payroll/payroll-entry.model')(sequelize);
const PerformanceReview = require('../../../modules/hr/performance/performance-review.model')(sequelize);
const TrainingCourse = require('../../../modules/hr/training/training-course.model')(sequelize);
const EmployeeTraining = require('../../../modules/hr/training/employee-training.model')(sequelize);
const CrmLead = require('../../../modules/crm/leads/lead.model')(sequelize);
const CrmInteraction = require('../../../modules/crm/interactions/crm-interaction.model')(sequelize);
const CrmSupportTicket = require('../../../modules/crm/support/support-ticket.model')(sequelize);
const CrmSupportMessage = require('../../../modules/crm/support/support-message.model')(sequelize);
const CrmContract = require('../../../modules/crm/contracts/crm-contract.model')(sequelize);

const models = { User, CompanySetting, TaxSetting, FinanceSetting, InventorySetting, SecuritySetting, SecurityEvent, SystemLog, PrintSetting, MoadianSetting, Role, Permission, UserRole, RolePermission, RefreshSession, Product, Category, ProductCategory, ProductImage, Warehouse, StockBalance, StockMovement, StockTransfer, StockTransferItem, StockCount, StockCountItem, CommercialDocument, CommercialDocumentItem, CommercialPartner, CommercialSettlement, SalesRepresentative, PayableSettlement, FinancialAccount, JournalEntry, JournalLine, FiscalYear, BankReconciliation, BankReconciliationLine, TreasuryAccount, TreasuryTransfer, CashVoucher, CustomerCheque, CompanyCheckbook, CompanyCheque, DirectPartnerSettlement, DirectPartnerSettlementAllocation, Department, Position, Employee, HrShift, ShiftAssignment, AttendanceRecord, LeaveRequest, PayrollEntry, PerformanceReview, TrainingCourse, EmployeeTraining, CrmLead, CrmInteraction, CrmSupportTicket, CrmSupportMessage, CrmContract };

//! =============== Relations ===============

// Each user has at most one role; each role can belong to many users.
User.hasOne(UserRole, { as: 'userRole', foreignKey: 'user_id' });
UserRole.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
Role.hasMany(UserRole, { as: 'userRoles', foreignKey: 'role_id' });
UserRole.belongsTo(Role, { as: 'role', foreignKey: 'role_id' });

// Roles and permissions have a many-to-many relationship via RolePermission.
Role.belongsToMany(Permission, {
  through: RolePermission,
  as: 'permissions',
  foreignKey: 'role_id',
  otherKey: 'permission_id',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  as: 'roles',
  foreignKey: 'permission_id',
  otherKey: 'role_id',
});

// Refresh sessions are stored per user so refresh can rotate and logout can revoke them.
User.hasMany(RefreshSession, { as: 'refreshSessions', foreignKey: 'user_id' });
RefreshSession.belongsTo(User, { as: 'user', foreignKey: 'user_id' });

Product.belongsToMany(Category, { through: ProductCategory, as: 'categories', foreignKey: 'product_id', otherKey: 'category_id' });
Category.belongsToMany(Product, { through: ProductCategory, as: 'products', foreignKey: 'category_id', otherKey: 'product_id' });
Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id' });
ProductImage.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });

Warehouse.hasMany(StockBalance, { as: 'stockBalances', foreignKey: 'warehouse_id' });
StockBalance.belongsTo(Warehouse, { as: 'warehouse', foreignKey: 'warehouse_id' });
Product.hasMany(StockBalance, { as: 'stocks', foreignKey: 'product_id' });
StockBalance.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
Warehouse.hasMany(StockMovement, { as: 'stockMovements', foreignKey: 'warehouse_id' });
StockMovement.belongsTo(Warehouse, { as: 'warehouse', foreignKey: 'warehouse_id' });
Product.hasMany(StockMovement, { as: 'stockMovements', foreignKey: 'product_id' });
StockMovement.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
User.hasMany(StockMovement, { as: 'createdStockMovements', foreignKey: 'created_by' });
StockMovement.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });

Warehouse.hasMany(StockTransfer, { as: 'outgoingTransfers', foreignKey: 'source_warehouse_id' });
StockTransfer.belongsTo(Warehouse, { as: 'sourceWarehouse', foreignKey: 'source_warehouse_id' });
Warehouse.hasMany(StockTransfer, { as: 'incomingTransfers', foreignKey: 'destination_warehouse_id' });
StockTransfer.belongsTo(Warehouse, { as: 'destinationWarehouse', foreignKey: 'destination_warehouse_id' });
User.hasMany(StockTransfer, { as: 'createdStockTransfers', foreignKey: 'created_by' });
StockTransfer.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
StockTransfer.hasMany(StockTransferItem, { as: 'items', foreignKey: 'transfer_id' });
StockTransferItem.belongsTo(StockTransfer, { as: 'transfer', foreignKey: 'transfer_id' });
Product.hasMany(StockTransferItem, { as: 'transferItems', foreignKey: 'product_id' });
StockTransferItem.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
Warehouse.hasMany(StockCount, { as: 'stockCounts', foreignKey: 'warehouse_id' });
StockCount.belongsTo(Warehouse, { as: 'warehouse', foreignKey: 'warehouse_id' });
User.hasMany(StockCount, { as: 'performedStockCounts', foreignKey: 'counted_by' });
StockCount.belongsTo(User, { as: 'countedBy', foreignKey: 'counted_by' });
StockCount.hasMany(StockCountItem, { as: 'items', foreignKey: 'count_id' });
StockCountItem.belongsTo(StockCount, { as: 'count', foreignKey: 'count_id' });
Product.hasMany(StockCountItem, { as: 'countItems', foreignKey: 'product_id' });
StockCountItem.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });

CommercialDocument.belongsTo(Warehouse, { as: 'warehouse', foreignKey: 'warehouse_id' });
Warehouse.hasMany(CommercialDocument, { as: 'commercialDocuments', foreignKey: 'warehouse_id' });
CommercialDocument.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
CommercialDocument.belongsTo(User, { as: 'reviewedBy', foreignKey: 'reviewed_by' });
CommercialDocument.belongsTo(CommercialDocument, { as: 'relatedDocument', foreignKey: 'related_document_id' });
CommercialDocument.belongsTo(CommercialDocument, { as: 'orderDocument', foreignKey: 'order_document_id' });
CommercialDocument.hasMany(CommercialDocument, { as: 'invoices', foreignKey: 'order_document_id' });
CommercialDocument.hasMany(CommercialDocument, { as: 'relatedDocuments', foreignKey: 'related_document_id' });
CommercialDocument.hasMany(CommercialDocumentItem, { as: 'items', foreignKey: 'document_id' });
CommercialDocumentItem.belongsTo(CommercialDocument, { as: 'document', foreignKey: 'document_id' });
CommercialDocumentItem.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
Product.hasMany(CommercialDocumentItem, { as: 'commercialDocumentItems', foreignKey: 'product_id' });

CommercialDocument.belongsTo(CommercialPartner, { as: 'partner', foreignKey: 'partner_id' });
CommercialDocument.belongsTo(SalesRepresentative, { as: 'salesRepresentative', foreignKey: 'sales_representative_id' });
SalesRepresentative.hasMany(CommercialDocument, { as: 'salesDocuments', foreignKey: 'sales_representative_id' });
CommercialPartner.hasMany(CommercialDocument, { as: 'documents', foreignKey: 'partner_id' });
CommercialDocument.hasMany(CommercialSettlement, { as: 'settlements', foreignKey: 'document_id' });
CommercialSettlement.belongsTo(CommercialDocument, { as: 'document', foreignKey: 'document_id' });
CommercialSettlement.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });


FinancialAccount.belongsTo(FinancialAccount, { as: 'parent', foreignKey: 'parent_id' });
FinancialAccount.hasMany(FinancialAccount, { as: 'children', foreignKey: 'parent_id' });
FinancialAccount.hasMany(JournalLine, { as: 'journalLines', foreignKey: 'account_id' });
JournalLine.belongsTo(FinancialAccount, { as: 'account', foreignKey: 'account_id' });
FinancialAccount.hasOne(TreasuryAccount, { as: 'treasuryAccount', foreignKey: 'financial_account_id' });
BankReconciliation.belongsTo(TreasuryAccount, { as: 'treasuryAccount', foreignKey: 'treasury_account_id' });
BankReconciliation.hasMany(BankReconciliationLine, { as: 'lines', foreignKey: 'reconciliation_id' });
BankReconciliationLine.belongsTo(BankReconciliation, { as: 'reconciliation', foreignKey: 'reconciliation_id' });
BankReconciliationLine.belongsTo(JournalLine, { as: 'matchedJournalLine', foreignKey: 'matched_journal_line_id' });
TreasuryAccount.belongsTo(FinancialAccount, { as: 'financialAccount', foreignKey: 'financial_account_id' });
JournalEntry.hasMany(JournalLine, { as: 'lines', foreignKey: 'journal_entry_id' });
JournalLine.belongsTo(JournalEntry, { as: 'entry', foreignKey: 'journal_entry_id' });
JournalLine.belongsTo(CommercialPartner, { as: 'partner', foreignKey: 'partner_id' });
JournalLine.belongsTo(TreasuryAccount, { as: 'treasuryAccount', foreignKey: 'treasury_account_id' });
TreasuryAccount.hasMany(JournalLine, { as: 'journalLines', foreignKey: 'treasury_account_id' });
CommercialSettlement.belongsTo(TreasuryAccount, { as: 'treasuryAccount', foreignKey: 'treasury_account_id' });
CommercialSettlement.belongsTo(JournalEntry, { as: 'journalEntry', foreignKey: 'journal_entry_id' });
CommercialSettlement.belongsTo(CommercialSettlement, { as: 'reverses', foreignKey: 'reverses_settlement_id' });
CommercialSettlement.hasOne(CommercialSettlement, { as: 'reversal', foreignKey: 'reverses_settlement_id' });
PayableSettlement.belongsTo(TreasuryAccount, { as: 'treasuryAccount', foreignKey: 'treasury_account_id' });
PayableSettlement.belongsTo(JournalEntry, { as: 'journalEntry', foreignKey: 'journal_entry_id' });
PayableSettlement.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
PayableSettlement.belongsTo(PayableSettlement, { as: 'reverses', foreignKey: 'reverses_settlement_id' });
PayableSettlement.hasOne(PayableSettlement, { as: 'reversal', foreignKey: 'reverses_settlement_id' });
TreasuryTransfer.belongsTo(TreasuryAccount, { as: 'sourceAccount', foreignKey: 'source_account_id' });
TreasuryTransfer.belongsTo(TreasuryAccount, { as: 'destinationAccount', foreignKey: 'destination_account_id' });
TreasuryTransfer.belongsTo(JournalEntry, { as: 'journalEntry', foreignKey: 'journal_entry_id' });
CashVoucher.belongsTo(TreasuryAccount, { as: 'treasuryAccount', foreignKey: 'treasury_account_id' });
CashVoucher.belongsTo(FinancialAccount, { as: 'counterpartAccount', foreignKey: 'counterpart_account_id' });
CashVoucher.belongsTo(CommercialPartner, { as: 'partner', foreignKey: 'partner_id' });
CashVoucher.belongsTo(JournalEntry, { as: 'journalEntry', foreignKey: 'journal_entry_id' });
CashVoucher.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
CashVoucher.belongsTo(CashVoucher, { as: 'originalVoucher', foreignKey: 'reverses_voucher_id' });
CashVoucher.hasOne(CashVoucher, { as: 'reversal', foreignKey: 'reverses_voucher_id' });
CustomerCheque.belongsTo(CommercialPartner, { as: 'issuer', foreignKey: 'issuer_partner_id' });
CustomerCheque.belongsTo(CommercialPartner, { as: 'transferredToPartner', foreignKey: 'transferred_to_partner_id' });
CustomerCheque.belongsTo(JournalEntry, { as: 'receiptJournalEntry', foreignKey: 'receipt_journal_entry_id' });
CustomerCheque.belongsTo(JournalEntry, { as: 'transferJournalEntry', foreignKey: 'transfer_journal_entry_id' });
CustomerCheque.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
CompanyCheckbook.belongsTo(TreasuryAccount, { as: 'treasuryAccount', foreignKey: 'treasury_account_id' });
CompanyCheckbook.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
CompanyCheckbook.hasMany(CompanyCheque, { as: 'cheques', foreignKey: 'checkbook_id' });
CompanyCheque.belongsTo(CompanyCheckbook, { as: 'checkbook', foreignKey: 'checkbook_id' });
CompanyCheque.belongsTo(CommercialPartner, { as: 'recipient', foreignKey: 'recipient_partner_id' });
CompanyCheque.belongsTo(JournalEntry, { as: 'issueJournalEntry', foreignKey: 'issue_journal_entry_id' });
CompanyCheque.belongsTo(JournalEntry, { as: 'clearanceJournalEntry', foreignKey: 'clearance_journal_entry_id' });
CompanyCheque.belongsTo(JournalEntry, { as: 'returnJournalEntry', foreignKey: 'return_journal_entry_id' });
DirectPartnerSettlement.belongsTo(CommercialPartner, { as: 'customer', foreignKey: 'customer_partner_id' });
DirectPartnerSettlement.belongsTo(CommercialPartner, { as: 'supplier', foreignKey: 'supplier_partner_id' });
DirectPartnerSettlement.belongsTo(JournalEntry, { as: 'journalEntry', foreignKey: 'journal_entry_id' });
DirectPartnerSettlement.belongsTo(DirectPartnerSettlement, { as: 'originalSettlement', foreignKey: 'reverses_settlement_id' });
DirectPartnerSettlement.hasOne(DirectPartnerSettlement, { as: 'reversal', foreignKey: 'reverses_settlement_id' });
DirectPartnerSettlement.hasMany(DirectPartnerSettlementAllocation, { as: 'allocations', foreignKey: 'settlement_id' });
DirectPartnerSettlementAllocation.belongsTo(DirectPartnerSettlement, { as: 'settlement', foreignKey: 'settlement_id' });
DirectPartnerSettlementAllocation.belongsTo(CommercialDocument, { as: 'document', foreignKey: 'document_id' });
TreasuryTransfer.belongsTo(TreasuryTransfer, { as: 'reverses', foreignKey: 'reverses_transfer_id' });
TreasuryTransfer.hasOne(TreasuryTransfer, { as: 'reversal', foreignKey: 'reverses_transfer_id' });
JournalEntry.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
User.hasMany(JournalEntry, { as: 'journalEntries', foreignKey: 'created_by' });
Department.hasMany(Position,{as:'positions',foreignKey:'department_id'}); Position.belongsTo(Department,{as:'department',foreignKey:'department_id'});
Department.hasMany(Employee,{as:'employees',foreignKey:'department_id'}); Employee.belongsTo(Department,{as:'department',foreignKey:'department_id'});
Position.hasMany(Employee,{as:'employees',foreignKey:'position_id'}); Employee.belongsTo(Position,{as:'position',foreignKey:'position_id'});
Employee.belongsTo(User,{as:'user',foreignKey:'user_id'}); User.hasOne(Employee,{as:'employee',foreignKey:'user_id'});
Employee.belongsTo(Employee,{as:'manager',foreignKey:'manager_id'}); Employee.hasMany(Employee,{as:'directReports',foreignKey:'manager_id'});
Employee.hasMany(ShiftAssignment,{as:'shiftAssignments',foreignKey:'employee_id'}); ShiftAssignment.belongsTo(Employee,{as:'employee',foreignKey:'employee_id'});
HrShift.hasMany(ShiftAssignment,{as:'assignments',foreignKey:'shift_id'}); ShiftAssignment.belongsTo(HrShift,{as:'shift',foreignKey:'shift_id'});
User.hasMany(ShiftAssignment,{as:'assignedShifts',foreignKey:'assigned_by'}); ShiftAssignment.belongsTo(User,{as:'assignedBy',foreignKey:'assigned_by'});
Employee.hasMany(AttendanceRecord,{as:'attendanceRecords',foreignKey:'employee_id'}); AttendanceRecord.belongsTo(Employee,{as:'employee',foreignKey:'employee_id'});
ShiftAssignment.hasOne(AttendanceRecord,{as:'attendance',foreignKey:'shift_assignment_id'}); AttendanceRecord.belongsTo(ShiftAssignment,{as:'shiftAssignment',foreignKey:'shift_assignment_id'});
Employee.hasMany(LeaveRequest,{as:'leaveRequests',foreignKey:'employee_id'}); LeaveRequest.belongsTo(Employee,{as:'employee',foreignKey:'employee_id'});
Employee.hasMany(PayrollEntry,{as:'payrollEntries',foreignKey:'employee_id'}); PayrollEntry.belongsTo(Employee,{as:'employee',foreignKey:'employee_id'});
PayrollEntry.belongsTo(JournalEntry,{as:'journalEntry',foreignKey:'journal_entry_id'}); PayrollEntry.belongsTo(JournalEntry,{as:'paymentJournalEntry',foreignKey:'payment_journal_entry_id'}); PayrollEntry.belongsTo(TreasuryAccount,{as:'paymentTreasuryAccount',foreignKey:'payment_treasury_account_id'});
Employee.hasMany(PerformanceReview,{as:'performanceReviews',foreignKey:'employee_id'}); PerformanceReview.belongsTo(Employee,{as:'employee',foreignKey:'employee_id'});
User.hasMany(PerformanceReview,{as:'writtenPerformanceReviews',foreignKey:'reviewer_id'}); PerformanceReview.belongsTo(User,{as:'reviewer',foreignKey:'reviewer_id'});
TrainingCourse.hasMany(EmployeeTraining,{as:'enrollments',foreignKey:'training_id'}); EmployeeTraining.belongsTo(TrainingCourse,{as:'training',foreignKey:'training_id'});
Employee.hasMany(EmployeeTraining,{as:'trainings',foreignKey:'employee_id'}); EmployeeTraining.belongsTo(Employee,{as:'employee',foreignKey:'employee_id'});
CrmLead.belongsTo(User,{as:'assignee',foreignKey:'assigned_to'}); User.hasMany(CrmLead,{as:'assignedLeads',foreignKey:'assigned_to'});
CrmLead.belongsTo(User,{as:'createdBy',foreignKey:'created_by'}); CrmLead.belongsTo(CommercialPartner,{as:'convertedPartner',foreignKey:'converted_partner_id'}); CommercialPartner.hasMany(CrmLead,{as:'crmLeads',foreignKey:'converted_partner_id'});
CrmInteraction.belongsTo(CrmLead,{as:'lead',foreignKey:'lead_id'}); CrmLead.hasMany(CrmInteraction,{as:'interactions',foreignKey:'lead_id'});
CrmInteraction.belongsTo(CommercialPartner,{as:'partner',foreignKey:'partner_id'}); CommercialPartner.hasMany(CrmInteraction,{as:'crmInteractions',foreignKey:'partner_id'});
CrmInteraction.belongsTo(User,{as:'createdBy',foreignKey:'created_by'});
CrmSupportTicket.belongsTo(CommercialPartner,{as:'partner',foreignKey:'partner_id'}); CommercialPartner.hasMany(CrmSupportTicket,{as:'supportTickets',foreignKey:'partner_id'});
CrmSupportTicket.belongsTo(CrmLead,{as:'lead',foreignKey:'lead_id'}); CrmLead.hasMany(CrmSupportTicket,{as:'supportTickets',foreignKey:'lead_id'});
CrmSupportTicket.belongsTo(CommercialDocument,{as:'document',foreignKey:'document_id'}); CommercialDocument.hasMany(CrmSupportTicket,{as:'supportTickets',foreignKey:'document_id'});
CrmSupportTicket.belongsTo(User,{as:'assignee',foreignKey:'assigned_to'}); CrmSupportTicket.belongsTo(User,{as:'createdBy',foreignKey:'created_by'});
CrmSupportTicket.hasMany(CrmSupportMessage,{as:'messages',foreignKey:'ticket_id'}); CrmSupportMessage.belongsTo(CrmSupportTicket,{as:'ticket',foreignKey:'ticket_id'}); CrmSupportMessage.belongsTo(User,{as:'author',foreignKey:'author_id'});
CrmContract.belongsTo(CommercialPartner,{as:'partner',foreignKey:'partner_id'}); CommercialPartner.hasMany(CrmContract,{as:'contracts',foreignKey:'partner_id'});
CrmContract.belongsTo(CrmLead,{as:'lead',foreignKey:'lead_id'}); CrmLead.hasMany(CrmContract,{as:'contracts',foreignKey:'lead_id'});
CrmContract.belongsTo(User,{as:'createdBy',foreignKey:'created_by'}); CrmContract.belongsTo(User,{as:'updatedBy',foreignKey:'updated_by'});
Object.assign(models, require('../../../modules/production/production.model')(sequelize));
Object.assign(models, require('../../../modules/assets/assets.model')(sequelize));
Object.assign(models, require('../../../modules/budgeting/budgeting.model')(sequelize));
Object.assign(models, require('../../../modules/project/project.model')(sequelize));
Object.assign(models, require('../../../modules/scm/scm.model')(sequelize));
const { ProductionBom, ProductionBomItem, ProductionOrder, ProductionOrderMaterial, ProductionOrderCost, ProductionQualityCheck, FixedAsset, FixedAssetDepreciation, FinancialBudget, FinancialBudgetLine, Project, ProjectTask, ProjectExpense, ScmShipment, ScmShipmentItem, ScmVendorUpdate } = models;
ProductionBom.hasMany(ProductionBomItem,{as:'items',foreignKey:'bom_id'}); ProductionBomItem.belongsTo(ProductionBom,{as:'bom',foreignKey:'bom_id'});
ProductionBom.belongsTo(Product,{as:'product',foreignKey:'product_id'}); ProductionBomItem.belongsTo(Product,{as:'product',foreignKey:'product_id'});
ProductionOrder.belongsTo(ProductionBom,{as:'bom',foreignKey:'bom_id'}); ProductionOrder.hasMany(ProductionOrderMaterial,{as:'materials',foreignKey:'order_id'}); ProductionOrder.hasMany(ProductionOrderCost,{as:'costs',foreignKey:'order_id'}); ProductionOrderCost.belongsTo(ProductionOrder,{as:'order',foreignKey:'order_id'}); ProductionOrderCost.belongsTo(JournalEntry,{as:'journalEntry',foreignKey:'journal_entry_id'}); ProductionOrderMaterial.belongsTo(ProductionOrder,{as:'order',foreignKey:'order_id'}); ProductionOrderMaterial.belongsTo(Product,{as:'product',foreignKey:'product_id'}); ProductionOrder.belongsTo(Product,{as:'product',foreignKey:'product_id'}); ProductionOrder.belongsTo(Warehouse,{as:'warehouse',foreignKey:'warehouse_id'}); ProductionOrder.hasMany(ProductionQualityCheck,{as:'qualityChecks',foreignKey:'order_id'}); ProductionQualityCheck.belongsTo(ProductionOrder,{as:'order',foreignKey:'order_id'});
FixedAsset.hasMany(FixedAssetDepreciation,{as:'depreciations',foreignKey:'asset_id'}); FixedAssetDepreciation.belongsTo(FixedAsset,{as:'asset',foreignKey:'asset_id'}); FixedAssetDepreciation.belongsTo(JournalEntry,{as:'journalEntry',foreignKey:'journal_entry_id'}); FixedAsset.belongsTo(JournalEntry,{as:'purchaseJournalEntry',foreignKey:'purchase_journal_entry_id'}); FixedAsset.belongsTo(JournalEntry,{as:'disposalJournalEntry',foreignKey:'disposal_journal_entry_id'});
FinancialBudget.hasMany(FinancialBudgetLine,{as:'lines',foreignKey:'budget_id'}); FinancialBudgetLine.belongsTo(FinancialBudget,{as:'budget',foreignKey:'budget_id'}); FinancialBudgetLine.belongsTo(FinancialAccount,{as:'account',foreignKey:'account_id'});
Project.hasMany(ProjectTask,{as:'tasks',foreignKey:'project_id'}); ProjectTask.belongsTo(Project,{as:'project',foreignKey:'project_id'}); Project.hasMany(ProjectExpense,{as:'expenses',foreignKey:'project_id'}); ProjectExpense.belongsTo(Project,{as:'project',foreignKey:'project_id'}); ProjectExpense.belongsTo(FinancialAccount,{as:'account',foreignKey:'account_id'}); ProjectExpense.belongsTo(JournalEntry,{as:'journalEntry',foreignKey:'journal_entry_id'});
ScmShipment.hasMany(ScmShipmentItem,{as:'items',foreignKey:'shipment_id'}); ScmShipmentItem.belongsTo(ScmShipment,{as:'shipment',foreignKey:'shipment_id'}); ScmShipmentItem.belongsTo(Product,{as:'product',foreignKey:'product_id'}); ScmShipment.belongsTo(CommercialPartner,{as:'partner',foreignKey:'partner_id'}); ScmShipment.belongsTo(CommercialDocument,{as:'document',foreignKey:'document_id'}); ScmShipment.belongsTo(Warehouse,{as:'sourceWarehouse',foreignKey:'source_warehouse_id'}); ScmShipment.belongsTo(Warehouse,{as:'destinationWarehouse',foreignKey:'destination_warehouse_id'}); ScmVendorUpdate.belongsTo(CommercialPartner,{as:'partner',foreignKey:'partner_id'}); ScmVendorUpdate.belongsTo(CommercialDocument,{as:'document',foreignKey:'document_id'});
module.exports = models;






