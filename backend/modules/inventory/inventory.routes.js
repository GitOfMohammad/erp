/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: مدیریت انبار، موجودی و گردش کالا
 * /inventory/warehouses:
 *   get:
 *     summary: فهرست انبارها
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: انبارها } }
 *   post:
 *     summary: ایجاد انبار
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: انبار ایجاد شد } }
 * /inventory/stock:
 *   get:
 *     summary: دریافت موجودی انبار
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: موجودی } }
 * /inventory/movements:
 *   get:
 *     summary: تاریخچه گردش موجودی
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست گردش‌های موجودی } }
 *   post:
 *     summary: ثبت ورود یا خروج کالا با جلوگیری از موجودی منفی؛ ورود دستی بهای واحد می‌خواهد
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: گردش ثبت شد }, 409: { description: موجودی کافی نیست } }
 * /inventory/transfers:
 *   get:
 *     summary: فهرست انتقال‌ها
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: انتقال‌ها } }
 *   post:
 *     summary: انتقال اتمیک کالا بین دو انبار
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceWarehouseId, destinationWarehouseId, items]
 *             properties:
 *               sourceWarehouseId: { type: string, format: uuid }
 *               destinationWarehouseId: { type: string, format: uuid }
 *               items: { type: array, items: { type: object, required: [productId, quantity], properties: { productId: { type: string, format: uuid }, quantity: { type: number, minimum: 0, exclusiveMinimum: true } } } }
 *               reference: { type: string, nullable: true }
 *               note: { type: string, nullable: true }
 *     responses: { 201: { description: انتقال ثبت شد }, 409: { description: موجودی کافی نیست } }
 * /inventory/transfers/{id}:
 *   get:
 *     summary: جزئیات انتقال
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: انتقال } }
 * /inventory/counts:
 *   get:
 *     summary: فهرست شمارش‌های موجودی
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست شمارش‌ها } }
 *   post:
 *     summary: ثبت شمارش فیزیکی و تعدیل اتمیک موجودی
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [warehouseId, items]
 *             properties:
 *               warehouseId: { type: string, format: uuid }
 *               items: { type: array, items: { type: object, required: [productId, countedQuantity], properties: { productId: { type: string, format: uuid }, countedQuantity: { type: number, minimum: 0 } } } }
 *               reference: { type: string, nullable: true }
 *               note: { type: string, nullable: true }
 *     responses: { 201: { description: شمارش ثبت و اختلاف موجودی تعدیل شد } }
 * /inventory/counts/{id}:
 *   get:
 *     summary: جزئیات شمارش موجودی
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: شمارش } }
 */
const {Router}=require('express'),c=require('./inventory.controller'),v=require('./inventory.validator'),validate=require('../../core/middlewares/schemaValidator'),id=require('../../core/middlewares/idValidator'),auth=require('../../core/middlewares/authenticate'),permit=require('../../core/middlewares/authorization');const r=Router();r.use(auth);r.get('/warehouses',permit('inventory.read'),validate(v.listWarehousesSchema,'query'),c.listWarehouses);r.post('/warehouses',permit('inventory.warehouses.manage'),validate(v.createWarehouseSchema),c.createWarehouse);r.get('/warehouses/:id',permit('inventory.read'),id(),c.getWarehouse);r.patch('/warehouses/:id',permit('inventory.warehouses.manage'),id(),validate(v.updateWarehouseSchema),c.updateWarehouse);r.delete('/warehouses/:id',permit('inventory.warehouses.manage'),id(),c.deleteWarehouse);r.get('/stock',permit('inventory.read'),validate(v.listStockSchema,'query'),c.listStock);r.patch('/warehouses/:warehouseId/products/:productId/reorder-point',permit('inventory.reorder.update'),id('warehouseId'),id('productId'),validate(v.reorderPointSchema),c.setReorderPoint);r.get('/movements',permit('inventory.read'),validate(v.listMovementsSchema,'query'),c.listMovements);r.post('/movements',permit('inventory.movements.create'),validate(v.createMovementSchema),c.createMovement);r.route('/transfers').get(permit('inventory.read'),validate(v.listDocsSchema,'query'),c.listTransfers).post(permit('inventory.transfers.create'),validate(v.createTransferSchema),c.createTransfer);r.get('/transfers/:id',permit('inventory.read'),id(),c.getTransfer);r.route('/counts').get(permit('inventory.read'),validate(v.listDocsSchema,'query'),c.listCounts).post(permit('inventory.counts.create'),validate(v.createCountSchema),c.createCount);r.post('/counts/:id/approve',permit('inventory.counts.approve'),id(),c.approveCount);r.get('/counts/:id',permit('inventory.read'),id(),c.getCount);module.exports=r;

