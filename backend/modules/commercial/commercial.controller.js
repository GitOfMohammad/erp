const ResponseApi=require('../../core/api/ResponseApi');
const service=require('./commercial.service');
const c={};
for(const type of Object.keys(service.TYPES)){
  c[type]={
    create:async(req,res)=>ResponseApi.created(res,{message:'سند بازرگانی ثبت شد',details:await service.create(type,req.validated.body,req.user.id)}),
    list:async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'فهرست اسناد دریافت شد',details:await service.list(type,req.validated.query)}),
    get:async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'سند دریافت شد',details:await service.get(req.params.id,type)}),
  };
  if(type.endsWith('ORDER')){
    c[type].update=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'سفارش ویرایش شد',details:await service.updateOrder(req.params.id,type,req.validated.body)});
    c[type].cancel=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'سفارش لغو شد',details:await service.cancelOrder(req.params.id,type,req.validated.body.reason,req.user.id)});
  }else{
    if(type==='PURCHASE_INVOICE')c[type].update=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'فاکتور خرید ویرایش شد',details:await service.updatePurchaseInvoice(req.params.id,req.validated.body)});
    if(type==='PURCHASE_RETURN')c[type].update=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'برگشت از خرید ویرایش شد',details:await service.updatePurchaseReturn(req.params.id,req.validated.body)});
    if(type==='SALES_INVOICE')c[type].update=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'فاکتور فروش ویرایش شد',details:await service.updateSalesInvoice(req.params.id,req.validated.body)});
    if(type==='SALES_RETURN')c[type].update=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'برگشت از فروش ویرایش شد',details:await service.updateSalesReturn(req.params.id,req.validated.body)});
    c[type].decision=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:req.validated.body.decision==='APPROVE'?'سند تأیید شد':'سند رد شد',details:await service.approve(req.params.id,req.validated.body.decision,req.user.id,req.validated.body.rejectionReason)});
    if(type.endsWith('INVOICE')){
      c[type].settle=async(req,res)=>ResponseApi.created(res,{message:req.validated.body.action==='REFUND'?'بازپرداخت ثبت شد':'پرداخت/دریافت ثبت شد',details:await service.addSettlement(type,req.params.id,req.validated.body,req.user.id)});
      c[type].reverseSettlement=async(req,res)=>ResponseApi.created(res,{message:'برگشت تسویه ثبت شد',details:await service.reverseSettlement(type,req.params.id,req.params.settlementId,req.validated.body,req.user.id)});
    }
  }
}
  c.financialBalances=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'مانده‌های مالی دریافت شد',details:await service.financialBalances(req.validated.query)});
c.settlementAccounts=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'حساب‌های فعال تسویه دریافت شد',details:await service.listSettlementAccounts()});
c.returnableItems=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'اقلام قابل برگشت فاکتور دریافت شد',details:await service.returnableItems(req.params.id)});
c.returnProducts=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'کالاهای خریداری‌شده از تأمین‌کننده دریافت شد',details:await service.returnableProducts(req.validated.query.partnerId,req.validated.query.search,req.validated.query.excludeReturnId)});
c.returnSalesProducts=async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'سوابق فروش کالا به مشتری دریافت شد',details:await service.returnableSalesProducts(req.validated.query.partnerId,req.validated.query.search,req.validated.query.excludeReturnId)});
c.salesRepresentatives={
  list:async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'فهرست ویزیتورها دریافت شد',details:await service.listSalesRepresentatives(req.validated.query)}),
  create:async(req,res)=>ResponseApi.created(res,{message:'ویزیتور ثبت شد',details:await service.createSalesRepresentative(req.validated.body)}),
  update:async(req,res)=>ResponseApi.ok(res,{type:'SUCCESS',message:'اطلاعات ویزیتور ویرایش شد',details:await service.updateSalesRepresentative(req.params.id,req.validated.body)}),
};
module.exports=c;
