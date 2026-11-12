'use strict'
module.exports = {
 async up(q,S) {
  await q.createTable('inventory_settings', {
   id:{type:S.TINYINT.UNSIGNED,primaryKey:true,allowNull:false,defaultValue:1},
   purchase_warehouse_id:{type:S.UUID,allowNull:true,references:{model:'warehouses',key:'id'},onDelete:'SET NULL',onUpdate:'CASCADE'},
   sales_warehouse_id:{type:S.UUID,allowNull:true,references:{model:'warehouses',key:'id'},onDelete:'SET NULL',onUpdate:'CASCADE'},
   production_warehouse_id:{type:S.UUID,allowNull:true,references:{model:'warehouses',key:'id'},onDelete:'SET NULL',onUpdate:'CASCADE'},
   require_count_approval:{type:S.BOOLEAN,allowNull:false,defaultValue:true},
   inventory_account_id:{type:S.UUID,allowNull:true,references:{model:'financial_accounts',key:'id'},onDelete:'SET NULL',onUpdate:'CASCADE'},
   stock_gain_account_id:{type:S.UUID,allowNull:true,references:{model:'financial_accounts',key:'id'},onDelete:'SET NULL',onUpdate:'CASCADE'},
   stock_loss_account_id:{type:S.UUID,allowNull:true,references:{model:'financial_accounts',key:'id'},onDelete:'SET NULL',onUpdate:'CASCADE'},
   created_at:{type:S.DATE,allowNull:false,defaultValue:S.literal('CURRENT_TIMESTAMP')},
   updated_at:{type:S.DATE,allowNull:false,defaultValue:S.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')},
  });
  await q.bulkInsert('inventory_settings',[{id:1,require_count_approval:true,created_at:new Date(),updated_at:new Date()}]);
 }, async down(q){await q.dropTable('inventory_settings')}
}
