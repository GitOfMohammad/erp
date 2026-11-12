const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('CompanySetting', {
  id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true, allowNull: false, defaultValue: 1 },
  displayName: { type: DataTypes.STRING(200), allowNull: true, field: 'display_name' },
  legalName: { type: DataTypes.STRING(250), allowNull: true, field: 'legal_name' },
  tradeName: { type: DataTypes.STRING(200), allowNull: true, field: 'trade_name' },
  legalForm: { type: DataTypes.STRING(100), allowNull: true, field: 'legal_form' },
  nationalId: { type: DataTypes.STRING(32), allowNull: true, field: 'national_id' },
  economicNumber: { type: DataTypes.STRING(32), allowNull: true, field: 'economic_number' },
  registrationNumber: { type: DataTypes.STRING(32), allowNull: true, field: 'registration_number' },
  phoneNumbers: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'phone_numbers' },
  mobileNumbers: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'mobile_numbers' },
  email: { type: DataTypes.STRING(254), allowNull: true },
  departmentEmails: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'department_emails' },
  website: { type: DataTypes.STRING(500), allowNull: true },
  socialAccounts: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'social_accounts' },
  addresses: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'addresses' },
  signatoryName: { type: DataTypes.STRING(200), allowNull: true, field: 'signatory_name' },
  signatoryTitle: { type: DataTypes.STRING(150), allowNull: true, field: 'signatory_title' },
  logoPath: { type: DataTypes.STRING(500), allowNull: true, field: 'logo_path' },
  stampPath: { type: DataTypes.STRING(500), allowNull: true, field: 'stamp_path' },
}, { tableName: 'company_settings' })
