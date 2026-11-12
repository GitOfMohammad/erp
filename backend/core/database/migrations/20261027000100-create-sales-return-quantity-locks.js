'use strict';
module.exports={
  async up(queryInterface,Sequelize){
    await queryInterface.createTable('commercial_sales_return_quantity_locks',{
      partner_id:{type:Sequelize.UUID,allowNull:false,primaryKey:true,references:{model:'commercial_partners',key:'id'},onDelete:'CASCADE'},
      product_id:{type:Sequelize.UUID,allowNull:false,primaryKey:true,references:{model:'products',key:'id'},onDelete:'CASCADE'},
      created_at:{type:Sequelize.DATE,allowNull:false},updated_at:{type:Sequelize.DATE,allowNull:false},
    });
  },
  async down(queryInterface){await queryInterface.dropTable('commercial_sales_return_quantity_locks');},
};
