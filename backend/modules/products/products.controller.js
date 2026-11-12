const R=require('../../core/api/ResponseApi'),s=require('./products.service');
async function list(q,r){R.ok(r,{type:'SUCCESS',message:'فهرست محصولات دریافت شد',details:await s.list(q.validated.query)});}
async function getById(q,r){R.ok(r,{type:'SUCCESS',message:'اطلاعات محصول دریافت شد',details:await s.getById(q.params.id)});}
async function create(q,r){R.created(r,{message:'محصول ایجاد شد',details:await s.create(q.validated.body)});}
async function previewImport(q,r){R.ok(r,{type:'SUCCESS',message:'پیش‌نمایش ورود کالا آماده شد',details:await s.previewImport(q.validated.body.rows)});}
async function importProducts(q,r){R.created(r,{message:'ورود گروهی کالا انجام شد',details:await s.importProducts(q.validated.body.rows)});}
async function update(q,r){R.ok(r,{type:'SUCCESS',message:'محصول ویرایش شد',details:await s.update(q.params.id,q.validated.body)});}
async function remove(q,r){R.ok(r,{type:'SUCCESS',message:'محصول حذف نرم شد',details:await s.remove(q.params.id)});}
async function listCategories(q,r){R.ok(r,{type:'SUCCESS',message:'دسته‌بندی‌ها دریافت شدند',details:await s.listCategories(q.validated.query)});}
async function createCategory(q,r){R.created(r,{message:'دسته‌بندی ایجاد شد',details:await s.createCategory(q.validated.body)});}
async function updateCategory(q,r){R.ok(r,{type:'SUCCESS',message:'دسته‌بندی ویرایش شد',details:await s.updateCategory(q.params.id,q.validated.body)});}
async function removeCategory(q,r){R.ok(r,{type:'SUCCESS',message:'دسته‌بندی حذف نرم شد',details:await s.removeCategory(q.params.id)});}
async function addImage(q,r){R.created(r,{message:'تصویر محصول افزوده شد',details:await s.addImage(q.params.id,q.file)});}
async function featureImage(q,r){R.ok(r,{type:'SUCCESS',message:'تصویر شاخص تنظیم شد',details:await s.featureImage(q.params.id,q.params.imageId)});}
async function removeImage(q,r){R.ok(r,{type:'SUCCESS',message:'تصویر حذف شد',details:await s.removeImage(q.params.id,q.params.imageId)});}
module.exports={list,getById,create,previewImport,importProducts,update,remove,listCategories,createCategory,updateCategory,removeCategory,addImage,featureImage,removeImage};
