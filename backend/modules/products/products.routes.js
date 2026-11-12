/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: مدیریت محصولات، دسته‌بندی‌ها و تصاویر
 * /products:
 *   get:
 *     summary: فهرست محصولات
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: فهرست محصولات }
 *   post:
 *     summary: ایجاد محصول
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unit, tax_type]
 *             properties:
 *               code: { type: string, readOnly: true, description: کد به‌صورت خودکار تخصیص داده می‌شود }
 *               name: { type: string }
 *               unit: { type: string }
 *               secondary_unit: { type: string, nullable: true }
 *               units_per_secondary: { type: integer, minimum: 1, nullable: true }
 *               weight_kg: { type: number, minimum: 0, nullable: true }
 *               sale_price: { type: integer, minimum: 0 }
 *               tax_type: { type: string, enum: [OFFICIAL, UNOFFICIAL] }
 *               barcode: { type: string, nullable: true }
 *               description: { type: string, nullable: true }
 *               reorder_point: { type: number, minimum: 0 }
 *               categoryIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       201: { description: محصول ایجاد شد }
 * /products/{id}:
 *   get:
 *     summary: دریافت محصول
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: محصول پیدا شد }
 *       404: { description: محصول پیدا نشد }
 *   patch:
 *     summary: ویرایش محصول
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: محصول ویرایش شد }
 *   delete:
 *     summary: حذف نرم محصول
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: محصول با ثبت deleted_at حذف شد }
 * /products/categories:
 *   get:
 *     summary: فهرست دسته‌بندی‌ها
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: دسته‌بندی‌ها }
 *   post:
 *     summary: ایجاد دسته‌بندی
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       201: { description: دسته‌بندی ایجاد شد }
 * /products/categories/{id}:
 *   patch:
 *     summary: ویرایش دسته‌بندی
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: دسته‌بندی ویرایش شد }
 *   delete:
 *     summary: حذف دسته‌بندی بدون محصول متصل
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: دسته‌بندی حذف شد }
 * /products/{id}/images:
 *   post:
 *     summary: آپلود تصویر محصول (حداکثر ۵ مگابایت، فرمت JPG/JPEG/PNG)
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: تصویر افزوده شد؛ اولین تصویر به‌صورت پیش‌فرض شاخص است }
 * /products/{id}/images/{imageId}/featured:
 *   put:
 *     summary: انتخاب تصویر شاخص محصول
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: تصویر شاخص تغییر کرد }
 * /products/{id}/images/{imageId}:
 *   delete:
 *     summary: حذف تصویر محصول
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: تصویر حذف شد }
 */const {Router}=require('express'),c=require('./products.controller'),v=require('./products.validator'),validate=require('../../core/middlewares/schemaValidator'),id=require('../../core/middlewares/idValidator'),auth=require('../../core/middlewares/authenticate'),permit=require('../../core/middlewares/authorization'),Upload=require('../../core/utils/upload');const r=Router();r.use(auth);
r.get('/categories',permit('products.read'),validate(v.listCategoriesSchema,'query'),c.listCategories);r.post('/categories',permit('products.categories.manage'),validate(v.createCategorySchema),c.createCategory);r.patch('/categories/:id',permit('products.categories.manage'),id(),validate(v.updateCategorySchema),c.updateCategory);r.delete('/categories/:id',permit('products.categories.manage'),id(),c.removeCategory);
r.post('/import/preview',permit('products.create'),validate(v.productImportSchema),c.previewImport);r.post('/import',permit('products.create'),validate(v.productImportSchema),c.importProducts);
r.get('/',permit('products.read'),validate(v.listProductsSchema,'query'),c.list);r.post('/',permit('products.create'),validate(v.createProductSchema),c.create);r.get('/:id',permit('products.read'),id(),c.getById);r.patch('/:id',permit('products.update'),id(),validate(v.updateProductSchema),c.update);r.delete('/:id',permit('products.delete'),id(),c.remove);
r.post('/:id/images',permit('products.images.manage'),id(),Upload.image('products','image'),c.addImage);r.put('/:id/images/:imageId/featured',permit('products.images.manage'),id(),id('imageId'),c.featureImage);r.delete('/:id/images/:imageId',permit('products.images.manage'),id(),id('imageId'),c.removeImage);module.exports=r;
