'use strict'

const crypto = require('node:crypto')

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM financial_accounts WHERE name = 'کسورات حقوق پرداختنی' LIMIT 1",
    )
    if (existing.length) return

    const [parents] = await queryInterface.sequelize.query(
      "SELECT id FROM financial_accounts WHERE name = 'بدهی‌های حقوق و دستمزد' AND account_type = 'LIABILITY' LIMIT 1",
    )
    if (!parents.length) throw new Error('گروه بدهی‌های حقوق و دستمزد برای افزودن حساب کسورات پیدا نشد')

    let code = 'PAY-DED'
    let suffix = 1
    while (true) {
      const [matches] = await queryInterface.sequelize.query(
        'SELECT id FROM financial_accounts WHERE code = :code LIMIT 1',
        { replacements: { code } },
      )
      if (!matches.length) break
      code = `PAY-DED-${suffix++}`
    }

    const now = new Date()
    await queryInterface.bulkInsert('financial_accounts', [{
      id: crypto.randomUUID(),
      code,
      name: 'کسورات حقوق پرداختنی',
      account_type: 'LIABILITY',
      parent_id: parents[0].id,
      is_group_root: 0,
      is_system: 1,
      is_postable: 1,
      is_active: 1,
      created_at: now,
      updated_at: now,
    }])
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM financial_accounts WHERE name = 'کسورات حقوق پرداختنی' LIMIT 1",
    )
    if (rows.length) {
      const [used] = await queryInterface.sequelize.query(
        'SELECT id FROM journal_lines WHERE account_id = :id LIMIT 1',
        { replacements: { id: rows[0].id } },
      )
      if (used.length) throw new Error('حساب کسورات حقوق گردش دارد و قابل حذف نیست')
      await queryInterface.bulkDelete('financial_accounts', { id: rows[0].id })
    }
  },
}
