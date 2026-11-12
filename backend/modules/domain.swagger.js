/**
 * @swagger
 * tags:
 *   - { name: Production, description: فرمول ساخت، دستور تولید و کنترل کیفیت }
 *   - { name: Fixed Assets, description: ثبت دارایی‌های ثابت }
 *   - { name: Budgeting, description: بودجه‌بندی حساب‌های مالی }
 *   - { name: Projects, description: پروژه‌ها، وظایف و هزینه‌ها }
 *   - { name: SCM, description: ارسال و تعامل با تأمین‌کنندگان }
 * /production/boms:
 *   get:
 *     tags: [Production]
 *     summary: فهرست فرمول‌های ساخت
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست صفحه‌بندی‌شده } }
 *   post:
 *     tags: [Production]
 *     summary: ثبت فرمول ساخت
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: فرمول ایجاد شد } }
 * /production/orders:
 *   get:
 *     tags: [Production]
 *     summary: فهرست دستورهای تولید
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست دستورها } }
 *   post:
 *     tags: [Production]
 *     summary: ایجاد دستور تولید
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: دستور ایجاد شد } }
 * /production/orders/{id}/actions/release:
 *   post:
 *     tags: [Production]
 *     summary: آزادسازی دستور تولید
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: وضعیت دستور به آزادشده تغییر کرد } }
 * /production/orders/{id}/actions/complete:
 *   post:
 *     tags: [Production]
 *     summary: تکمیل دستور تولید پس از کنترل کیفیت
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: وضعیت دستور تکمیل شد } }
 * /production/quality-checks:
 *   post:
 *     tags: [Production]
 *     summary: ثبت نتیجه کنترل کیفیت
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: نتیجه کنترل کیفیت ثبت شد } }
 * /financial/assets/register:
 *   get:
 *     tags: [Fixed Assets]
 *     summary: فهرست دارایی‌ها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست دارایی‌های فعال } }
 *   post:
 *     tags: [Fixed Assets]
 *     summary: ثبت دارایی ثابت
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: دارایی ثبت شد } }
 * /financial/budgets/budgets:
 *   get:
 *     tags: [Budgeting]
 *     summary: فهرست بودجه‌ها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست بودجه‌ها } }
 *   post:
 *     tags: [Budgeting]
 *     summary: ایجاد بودجه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: بودجه ایجاد شد } }
 * /projects/projects:
 *   get:
 *     tags: [Projects]
 *     summary: فهرست پروژه‌ها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست پروژه‌ها } }
 *   post:
 *     tags: [Projects]
 *     summary: ایجاد پروژه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: پروژه ایجاد شد } }
 * /projects/tasks:
 *   get:
 *     tags: [Projects]
 *     summary: فهرست وظایف پروژه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست وظایف } }
 * /projects/expenses:
 *   post:
 *     tags: [Projects]
 *     summary: ثبت هزینه پروژه
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: هزینه در انتظار بررسی ثبت شد } }
 * /scm/shipments:
 *   get:
 *     tags: [SCM]
 *     summary: فهرست مرسوله‌ها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست مرسوله‌ها } }
 *   post:
 *     tags: [SCM]
 *     summary: ثبت مرسوله
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: مرسوله ثبت شد } }
 * /scm/shipments/{id}/actions/deliver:
 *   post:
 *     tags: [SCM]
 *     summary: تحویل مرسوله و انتقال موجودی بین انبارهای داخلی
 *     description: فقط مرسوله بدون فاکتور مرتبط موجودی را منتقل می‌کند؛ فاکتور تأییدشده قبلاً موجودی را تغییر داده است.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: انتقال موجودی و دو گردش انبار ثبت شد }, 409: { description: موجودی مبدأ کافی نیست } }
 * /scm/vendor-updates:
 *   post:
 *     tags: [SCM]
 *     summary: ثبت پیام یا به‌روزرسانی تأمین‌کننده
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: به‌روزرسانی ذخیره شد } }
  * /financial/assets/register/{id}/depreciate:
 *   post:
 *     tags: [Fixed Assets]
 *     summary: ثبت استهلاک خط مستقیم برای یک ماه پیوسته
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 201: { description: استهلاک دوره محاسبه و ثبت شد }, 409: { description: دوره تکراری یا غیرپیوسته است } }
 * /financial/budgets/budgets/{id}/variance:
 *   get:
 *     tags: [Budgeting]
 *     summary: مقایسه بودجه تأییدشده با دفتر کل قطعی به تفکیک ماه و سرفصل
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: مبالغ بودجه، عملکرد و انحراف به ریال } }
 * /scm/shipment-items:
 *   post:
 *     tags: [SCM]
 *     summary: افزودن کالا و تعداد به مرسوله برنامه‌ریزی‌شده
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: قلم مرسوله افزوده شد } }*/





/**
 * @swagger
 * /production/orders/{id}/costs:
 *   post:
 *     tags: [Production]
 *     summary: ثبت دستی دستمزد یا سربار در کار در جریان ساخت
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cost_type, cost_date, description, amount]
 *             properties:
 *               cost_type: { type: string, enum: [LABOR, OVERHEAD] }
 *               cost_date: { type: string, format: date }
 *               description: { type: string, maxLength: 300 }
 *               amount: { type: string, pattern: '^[1-9][0-9]{0,17}$', description: مبلغ به ریال }
 *     responses: { 201: { description: هزینه ثبت و به حساب پرداختنی بستانکار شد }, 409: { description: دستور تولید باز نیست } }
 * /financial/assets/register/{id}/dispose:
 *   post:
 *     tags: [Fixed Assets]
 *     summary: اسقاط دارایی و ثبت زیان/استهلاک انباشته در دفتر کل
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [disposal_date]
 *             properties:
 *               disposal_date: { type: string, format: date }
 *               notes: { type: string, maxLength: 500 }
 *     responses: { 200: { description: دارایی اسقاط و سند دفتر کل ثبت شد } }
 * /projects/expenses/{id}/actions/approve:
 *   post:
 *     tags: [Projects]
 *     summary: تأیید هزینه پروژه و ایجاد سند هزینه/پرداختنی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: هزینه تأیید و در دفتر کل ثبت شد } }
 */
