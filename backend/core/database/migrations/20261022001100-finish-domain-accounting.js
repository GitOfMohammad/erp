'use strict';
const crypto=require('node:crypto');
module.exports={
 async up(q,S){
  const fk=(model,nullable=false)=>({type:S.UUID,allowNull:nullable,references:{model,key:'id'},onUpdate:'CASCADE',onDelete:nullable?'SET NULL':'RESTRICT'});
  const now=new Date();
  for(const [code,name,type] of [['1600','دارایی ثابت','ASSET'],['5600','زیان اسقاط دارایی','EXPENSE']]){
   const [rows]=await q.sequelize.query('SELECT id, account_type FROM financial_accounts WHERE code = :code',{replacements:{code}});
   if(rows.length&&rows[0].account_type!==type)throw new Error('نوع حساب '+code+' ناسازگار است');
   if(!rows.length){const account_id=crypto.randomUUID();await q.bulkInsert('financial_accounts',[{id:account_id,code,name,account_type:type,parent_id:null,is_system:1,is_postable:1,is_active:1,created_at:now,updated_at:now}]);await q.bulkInsert('erp_domain_seeded_accounts',[{code,account_id,created_at:now,updated_at:now}]);}
  }
  await q.addColumn('fixed_assets','purchase_journal_entry_id',{...fk('journal_entries',true),unique:true});
  await q.addColumn('fixed_assets','disposal_date',{type:S.DATEONLY,allowNull:true});
  await q.addColumn('fixed_assets','disposal_journal_entry_id',{...fk('journal_entries',true),unique:true});
  await q.addColumn('project_expenses','journal_entry_id',{...fk('journal_entries',true),unique:true});
  await q.addColumn('scm_shipments','source_warehouse_id',fk('warehouses',true));
  await q.addColumn('scm_shipments','destination_warehouse_id',fk('warehouses',true));
  await q.addColumn('scm_shipments','inventory_applied_at',{type:S.DATE,allowNull:true});
  await q.createTable('production_order_costs',{id:{type:S.UUID,allowNull:false,primaryKey:true},order_id:fk('production_orders'),cost_type:{type:S.ENUM('LABOR','OVERHEAD'),allowNull:false},cost_date:{type:S.DATEONLY,allowNull:false},description:{type:S.STRING(300),allowNull:false},amount:{type:S.DECIMAL(18,0),allowNull:false},journal_entry_id:{...fk('journal_entries'),unique:true},posted_by:fk('users'),created_at:{type:S.DATE,allowNull:false},updated_at:{type:S.DATE,allowNull:false}});
 },
 async down(q){
  const [costs]=await q.sequelize.query("SELECT journal_entry_id FROM production_order_costs");
  const refs=[...costs.map(x=>x.journal_entry_id)];
  for(const table of ['fixed_assets','project_expenses']){const cols=table==='fixed_assets'?['purchase_journal_entry_id','disposal_journal_entry_id']:['journal_entry_id'];for(const col of cols){const [rows]=await q.sequelize.query(`SELECT ${col} AS id FROM ${table} WHERE ${col} IS NOT NULL`);refs.push(...rows.map(x=>x.id));}}
  for(const id of refs){const [used]=await q.sequelize.query('SELECT COUNT(*) AS n FROM journal_lines WHERE journal_entry_id = :id',{replacements:{id}});if(Number(used[0].n))throw new Error('Migration rollback blocked: journal entries are in use');}
  await q.dropTable('production_order_costs');
  for(const [table,col] of [['scm_shipments','inventory_applied_at'],['scm_shipments','destination_warehouse_id'],['scm_shipments','source_warehouse_id'],['project_expenses','journal_entry_id'],['fixed_assets','disposal_journal_entry_id'],['fixed_assets','disposal_date'],['fixed_assets','purchase_journal_entry_id']])await q.removeColumn(table,col);
  const [seeded]=await q.sequelize.query("SELECT code,account_id FROM erp_domain_seeded_accounts WHERE code IN ('1600','5600')");
  for(const a of seeded){const [used]=await q.sequelize.query('SELECT COUNT(*) AS n FROM journal_lines WHERE account_id=:id',{replacements:{id:a.account_id}});if(Number(used[0].n))throw new Error('Cannot remove used seeded account '+a.code);await q.bulkDelete('financial_accounts',{id:a.account_id});await q.bulkDelete('erp_domain_seeded_accounts',{code:a.code});}
 }
};
