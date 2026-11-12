'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('company_settings', {
      id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, primaryKey: true, defaultValue: 1 },
      display_name: { type: Sequelize.STRING(200), allowNull: true },
      legal_name: { type: Sequelize.STRING(250), allowNull: true },
      trade_name: { type: Sequelize.STRING(200), allowNull: true },
      legal_form: { type: Sequelize.STRING(100), allowNull: true },
      national_id: { type: Sequelize.STRING(32), allowNull: true },
      economic_number: { type: Sequelize.STRING(32), allowNull: true },
      registration_number: { type: Sequelize.STRING(32), allowNull: true },
      phone_numbers: { type: Sequelize.JSON, allowNull: false },
      mobile_numbers: { type: Sequelize.JSON, allowNull: false },
      email: { type: Sequelize.STRING(254), allowNull: true },
      department_emails: { type: Sequelize.JSON, allowNull: false },
      website: { type: Sequelize.STRING(500), allowNull: true },
      social_accounts: { type: Sequelize.JSON, allowNull: false },
      addresses: { type: Sequelize.JSON, allowNull: false },
      signatory_name: { type: Sequelize.STRING(200), allowNull: true },
      signatory_title: { type: Sequelize.STRING(150), allowNull: true },
      logo_path: { type: Sequelize.STRING(500), allowNull: true },
      stamp_path: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('company_settings');
  },
};
