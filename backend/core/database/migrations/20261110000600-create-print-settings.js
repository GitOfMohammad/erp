'use strict'
module.exports = {
  async up(q, S) {
    await q.createTable('print_settings', {
      id: { type: S.TINYINT.UNSIGNED, allowNull: false, primaryKey: true, defaultValue: 1 },
      print_options: { type: S.JSON, allowNull: false }, templates: { type: S.JSON, allowNull: false }, document_defaults: { type: S.JSON, allowNull: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    })
  },
  async down(q) { await q.dropTable('print_settings') },
}
