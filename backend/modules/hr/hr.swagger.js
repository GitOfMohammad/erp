/**
 * @swagger
 * tags:
 *   - name: HR
 *     description: پرونده کارکنان، شیفت، حضور و غیاب و خدمات منابع انسانی
 * /hr/employees:
 *   get:
 *     tags: [HR]
 *     summary: فهرست کارکنان
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست کارکنان } }
 *   post:
 *     tags: [HR]
 *     summary: ایجاد پرونده کارمند
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: پرونده ایجاد شد } }
 * /hr/employees/{id}:
 *   get:
 *     tags: [HR]
 *     summary: جزئیات پرونده کارمند
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: پرونده کارمند } }
 *   patch:
 *     tags: [HR]
 *     summary: ویرایش پرونده کارمند
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: پرونده ویرایش شد } }
 * /hr/shifts:
 *   get:
 *     tags: [HR]
 *     summary: فهرست شیفت‌ها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: شیفت‌ها } }
 *   post:
 *     tags: [HR]
 *     summary: تعریف شیفت کاری
 *     description: زمان پایان زودتر از شروع برای شیفت شب مجاز است.
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: شیفت ایجاد شد } }
 * /hr/shifts/{id}:
 *   patch:
 *     tags: [HR]
 *     summary: ویرایش یا غیرفعال‌کردن شیفت
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: شیفت ویرایش شد } }
 * /hr/shift-assignments:
 *   get:
 *     tags: [HR]
 *     summary: برنامه تخصیص شیفت‌ها
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: برنامه شیفت } }
 *   post:
 *     tags: [HR]
 *     summary: تخصیص شیفت به کارمند برای یک روز
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: شیفت تخصیص یافت } }
 * /hr/attendance:
 *   get:
 *     tags: [HR]
 *     summary: سوابق حضور و غیاب
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: سوابق حضور } }
 * /hr/attendance/check-in:
 *   post:
 *     tags: [HR]
 *     summary: ثبت ورود کارمند واردشده
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: ورود ثبت شد } }
 * /hr/attendance/check-out:
 *   post:
 *     tags: [HR]
 *     summary: ثبت خروج کارمند واردشده
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: خروج ثبت شد } }
 * /hr/attendance/manual:
 *   post:
 *     tags: [HR]
 *     summary: ثبت دستی حضور و غیاب توسط مدیر
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: حضور ثبت شد } }
 * /hr/leaves:
 *   get:
 *     tags: [HR]
 *     summary: فهرست درخواست‌های مرخصی
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: درخواست‌ها } }
 *   post:
 *     tags: [HR]
 *     summary: ثبت درخواست مرخصی کارمند
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: درخواست ثبت شد } }
 * /hr/leaves/{id}/review:
 *   patch:
 *     tags: [HR]
 *     summary: تأیید یا رد درخواست مرخصی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: درخواست بررسی شد } }
 * /hr/payroll:
 *   get:
 *     tags: [HR]
 *     summary: فهرست فیش‌های حقوقی
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فیش‌ها } }
 *   post:
 *     tags: [HR]
 *     summary: ثبت فیش حقوقی دستی به ریال
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: فیش ایجاد شد } }
 * /hr/payroll/{id}/pay:
 *   patch:
 *     tags: [HR]
 *     summary: ثبت پرداخت فیش حقوقی
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: پرداخت ثبت شد } }
 * /hr/performance-reviews:
 *   get:
 *     tags: [HR]
 *     summary: فهرست ارزیابی عملکرد
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: ارزیابی‌ها } }
 *   post:
 *     tags: [HR]
 *     summary: ثبت ارزیابی عملکرد
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: ارزیابی ثبت شد } }
 * /hr/trainings:
 *   get:
 *     tags: [HR]
 *     summary: فهرست دوره‌های آموزشی
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: دوره‌ها } }
 *   post:
 *     tags: [HR]
 *     summary: ایجاد دوره آموزشی
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: دوره ایجاد شد } }
 */
