const Joi=require('joi');
const id=Joi.string().guid({version:['uuidv4','uuidv5']});
const str=n=>Joi.string().trim().min(1).max(n);
const nul=n=>Joi.string().trim().max(n).allow('',null).empty('').default(null);
const createProductSchema=Joi.object({
  name:str(200).required(),
  unit:str(30).default('عدد'),
  secondary_unit:Joi.string().trim().max(30).allow('',null).empty('').default(null),
  units_per_secondary:Joi.number().integer().min(1).max(1000000).allow(null).empty('').default(null),
  weight_kg:Joi.number().min(0).max(999999999.999).precision(3).allow(null).empty('').default(null),
  sale_price:Joi.number().integer().min(0).max(9007199254740991).default(0),
  tax_type:Joi.string().valid('OFFICIAL','UNOFFICIAL').required(),
  barcode:nul(64),
  description:Joi.string().trim().allow('',null).default(null),
  reorder_point:Joi.number().min(0).precision(3).default(0),
  is_active:Joi.number().integer().valid(0,1).default(1),
  categoryIds:Joi.array().items(id).unique().default([]),
}).custom((value,helpers)=>{
  if(Boolean(value.secondary_unit)!==Boolean(value.units_per_secondary)) return helpers.error('any.invalid');
  return value;
},'validate product unit pairing').messages({'any.invalid':'واحد فرعی و ضریب تبدیل باید با هم تکمیل شوند یا هر دو خالی بمانند'}).required();
const updateProductSchema=Joi.object({
  name:str(200),
  unit:str(30),
  secondary_unit:Joi.string().trim().max(30).allow('',null),
  units_per_secondary:Joi.number().integer().min(1).max(1000000).allow(null).empty(''),
  weight_kg:Joi.number().min(0).max(999999999.999).precision(3).allow(null).empty(''),
  sale_price:Joi.number().integer().min(0).max(9007199254740991),
  tax_type:Joi.string().valid('OFFICIAL','UNOFFICIAL').allow(null),
  barcode:Joi.string().trim().max(64).allow('',null).empty(''),
  description:Joi.string().trim().allow('',null),
  reorder_point:Joi.number().min(0).precision(3),
  is_active:Joi.number().integer().valid(0,1),
  categoryIds:Joi.array().items(id).unique(),
}).custom((value,helpers)=>{
  if(Boolean(value.secondary_unit)!==Boolean(value.units_per_secondary)) return helpers.error('any.invalid');
  return value;
},'validate product unit patch').messages({'any.invalid':'برای تغییر بسته‌بندی، واحد فرعی و ضریب تبدیل را با هم وارد کنید'}).min(1).required();
const listProductsSchema=Joi.object({page:Joi.number().integer().min(1).default(1),limit:Joi.number().integer().min(1).max(100).default(20),search:Joi.string().trim().max(100).allow('').default(''),categoryId:id,is_active:Joi.number().integer().valid(0,1)}).required();
const productImportSchema=Joi.object({rows:Joi.array().items(Joi.object().unknown(true)).min(1).max(1000).required()}).required();
const createCategorySchema=Joi.object({name:str(100).required(),description:nul(500).default(null),is_active:Joi.number().integer().valid(0,1).default(1)}).required();
const updateCategorySchema=Joi.object({name:str(100),description:nul(500),is_active:Joi.number().integer().valid(0,1)}).min(1).required();
const listCategoriesSchema=Joi.object({page:Joi.number().integer().min(1).default(1),limit:Joi.number().integer().min(1).max(100).default(100),search:Joi.string().trim().max(100).allow('').default('')}).required();
module.exports={createProductSchema,updateProductSchema,listProductsSchema,createCategorySchema,updateCategorySchema,listCategoriesSchema,productImportSchema};
