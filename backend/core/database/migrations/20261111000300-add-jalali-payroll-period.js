'use strict'

function jalaliParts(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC',
  }).formatToParts(date)
  const value = type => Number(parts.find(part => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

function findJalaliMonthStart(year, month, around) {
  for (let offset = -45; offset <= 45; offset += 1) {
    const date = new Date(around.getTime() + offset * 86400000)
    const parts = jalaliParts(date)
    if (parts.year === year && parts.month === month && parts.day === 1) return date.toISOString().slice(0, 10)
  }
  throw new Error(`شروع ماه شمسی ${year}/${month} پیدا نشد`)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hr_payroll_entries', 'period_jalali', {
      type: Sequelize.STRING(7), allowNull: true,
    })
    await queryInterface.addColumn('hr_payroll_entries', 'period_start_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    })

    const [rows] = await queryInterface.sequelize.query(
      'SELECT id, period FROM hr_payroll_entries ORDER BY period ASC, id ASC',
    )
    for (const row of rows) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(row.period))) {
        throw new Error(`دورهٔ حقوق ${row.period} برای تبدیل به تقویم شمسی معتبر نیست`)
      }
      const [storedYear, storedMonth] = row.period.split('-').map(Number)
      let year; let month; let around
      if (storedYear >= 1200 && storedYear <= 1600) {
        year = storedYear
        month = storedMonth
        around = new Date(Date.UTC(year + 621, 2, 21 + (month - 1) * 30))
      } else {
        // Older UI versions stored the Gregorian month containing the selected Jalali month's midpoint.
        around = new Date(Date.UTC(storedYear, storedMonth - 1, 15))
        ;({ year, month } = jalaliParts(around))
      }
      const periodJalali = `${year}-${String(month).padStart(2, '0')}`
      const periodStartDate = findJalaliMonthStart(year, month, around)
      await queryInterface.sequelize.query(
        'UPDATE hr_payroll_entries SET period_jalali = :periodJalali, period_start_date = :periodStartDate WHERE id = :id',
        { replacements: { id: row.id, periodJalali, periodStartDate } },
      )
    }

    await queryInterface.changeColumn('hr_payroll_entries', 'period_jalali', {
      type: Sequelize.STRING(7), allowNull: false,
    })
    await queryInterface.changeColumn('hr_payroll_entries', 'period_start_date', {
      type: Sequelize.DATEONLY, allowNull: false,
    })
    await queryInterface.addIndex('hr_payroll_entries', ['employee_id', 'period_jalali'], {
      unique: true, name: 'hr_payroll_employee_jalali_period_uq',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('hr_payroll_entries', 'hr_payroll_employee_jalali_period_uq')
    await queryInterface.removeColumn('hr_payroll_entries', 'period_start_date')
    await queryInterface.removeColumn('hr_payroll_entries', 'period_jalali')
  },
}
