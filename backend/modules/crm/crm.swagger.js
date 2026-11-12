/**
 * @swagger
 * tags:
 *   - name: CRM
 *     description: سرنخ فروش، تعامل با مشتری، پشتیبانی و قرارداد
 * /crm/leads:
 *   get:
 *     tags: [CRM]
 *     summary: فهرست سرنخ‌ها با فیلتر مرحله و مسئول
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: سرنخ‌ها } }
 *   post:
 *     tags: [CRM]
 *     summary: ثبت سرنخ
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: سرنخ ایجاد شد } }
 * /crm/leads/{id}:
 *   get:
 *     tags: [CRM]
 *     summary: جزئیات سرنخ
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: سرنخ } }
 *   patch:
 *     tags: [CRM]
 *     summary: ویرایش اطلاعات سرنخ
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: سرنخ ویرایش شد } }
 * /crm/leads/{id}/status:
 *   post:
 *     tags: [CRM]
 *     summary: تغییر مرحلهٔ سرنخ یا ثبت دلیل ازدست‌رفتن
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: مرحله تغییر کرد } }
 * /crm/leads/{id}/convert:
 *   post:
 *     tags: [CRM]
 *     summary: تبدیل سرنخ واجد شرایط به مشتری موجود یا مشتری جدید با پیوند به بازرگانی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 201: { description: مشتری ایجاد یا انتخاب و به سرنخ متصل شد } }
 * /crm/interactions:
 *   get:
 *     tags: [CRM]
 *     summary: فهرست تماس‌ها، ایمیل‌ها، جلسه‌ها و پیگیری‌ها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: تعامل‌ها } }
 *   post:
 *     tags: [CRM]
 *     summary: ثبت تعامل با سرنخ یا مشتری
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: تعامل ثبت شد } }
 * /crm/support/tickets:
 *   get:
 *     tags: [CRM]
 *     summary: فهرست تیکت‌ها با فیلتر اولویت، وضعیت و مشتری
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: تیکت‌ها } }
 *   post:
 *     tags: [CRM]
 *     summary: ثبت تیکت برای مشتری فعال
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: تیکت ایجاد شد } }
 * /crm/support/tickets/{id}:
 *   get:
 *     tags: [CRM]
 *     summary: جزئیات تیکت
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: تیکت } }
 *   patch:
 *     tags: [CRM]
 *     summary: تخصیص یا تغییر وضعیت تیکت
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: تیکت به‌روزرسانی شد } }
 * /crm/support/tickets/{id}/messages:
 *   get:
 *     tags: [CRM]
 *     summary: دریافت گفتگوی تیکت و یادداشت‌های داخلی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: پیام‌ها } }
 *   post:
 *     tags: [CRM]
 *     summary: افزودن پاسخ یا یادداشت داخلی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 201: { description: پیام ثبت شد } }
 * /crm/contracts:
 *   get:
 *     tags: [CRM]
 *     summary: فهرست قراردادها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: قراردادها } }
 *   post:
 *     tags: [CRM]
 *     summary: ثبت پیش‌نویس یا قرارداد مشتری
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: قرارداد ثبت شد } }
 * /crm/contracts/{id}:
 *   get:
 *     tags: [CRM]
 *     summary: جزئیات قرارداد
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: قرارداد } }
 *   patch:
 *     tags: [CRM]
 *     summary: ویرایش پیش‌نویس یا تغییر وضعیت قرارداد
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: قرارداد به‌روزرسانی شد } }
 * /crm/contracts/{id}/file:
 *   get:
 *     tags: [CRM]
 *     summary: دانلود PDF قرارداد با دسترسی مجاز
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200:
 *         description: فایل PDF قرارداد
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       401: { description: توکن معتبر ارسال نشده است }
 *       403: { description: مجوز مشاهده قرارداد وجود ندارد }
 *       404: { description: قرارداد یا فایل پیدا نشد }
 *   post:
 *     tags: [CRM]
 *     summary: بارگذاری فایل PDF قرارداد
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses: { 200: { description: فایل ذخیره شد } }
 */
