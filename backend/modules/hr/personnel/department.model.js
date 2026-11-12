const {DataTypes}=require('sequelize');
module.exports=s=>s.define('Department',{id:{type:DataTypes.UUID,primaryKey:true,defaultValue:DataTypes.UUIDV4},code:{type:DataTypes.STRING(40),allowNull:false,unique:true},name:{type:DataTypes.STRING(120),allowNull:false},description:{type:DataTypes.TEXT},is_active:{type:DataTypes.TINYINT,allowNull:false,defaultValue:1}},{tableName:'hr_departments'});
