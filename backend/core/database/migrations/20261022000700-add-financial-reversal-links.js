'use strict';
module.exports={
  async up(q,S){
    await q.addColumn('commercial_settlements','reverses_settlement_id',{type:S.UUID,allowNull:true,references:{model:'commercial_settlements',key:'id'},onDelete:'RESTRICT',onUpdate:'CASCADE'});
    await q.addIndex('commercial_settlements',['reverses_settlement_id'],{unique:true,name:'commercial_settlements_reversal_unique'});
    await q.addColumn('treasury_transfers','reverses_transfer_id',{type:S.UUID,allowNull:true,references:{model:'treasury_transfers',key:'id'},onDelete:'RESTRICT',onUpdate:'CASCADE'});
    await q.addIndex('treasury_transfers',['reverses_transfer_id'],{unique:true,name:'treasury_transfers_reversal_unique'});
  },
  async down(q){
    await q.removeIndex('treasury_transfers','treasury_transfers_reversal_unique');
    await q.removeColumn('treasury_transfers','reverses_transfer_id');
    await q.removeIndex('commercial_settlements','commercial_settlements_reversal_unique');
    await q.removeColumn('commercial_settlements','reverses_settlement_id');
  },
};
