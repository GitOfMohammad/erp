/**
 * @swagger
 * tags:
 *   - name: Payables
 *     description: مانده بدهی‌ها و پرداخت جزئی یا کامل آن‌ها
 * /financial/payables:
 *   get:
 *     tags: [Payables]
 *     summary: فهرست پرداختنی‌های باز یا تسویه‌شده
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: sourceType, schema: { type: string, enum: [FIXED_ASSET_ACQUISITION, PROJECT_EXPENSE, PRODUCTION_ORDER_COST] } }
 *       - { in: query, name: openOnly, schema: { type: boolean, default: true } }
 *     responses: { 200: { description: مانده پرداختنی‌ها به ریال } }
 * /financial/payables/{sourceType}/{sourceId}:
 *   get:
 *     tags: [Payables]
 *     summary: جزئیات پرداختنی و سوابق تسویه
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: sourceType, required: true, schema: { type: string, enum: [FIXED_ASSET_ACQUISITION, PROJECT_EXPENSE, PRODUCTION_ORDER_COST] } }
 *       - { in: path, name: sourceId, required: true, schema: { type: string, format: uuid } }
 *     responses: { 200: { description: مانده و سوابق پرداخت } }
 * /financial/payables/{sourceType}/{sourceId}/settlements:
 *   post:
 *     tags: [Payables]
 *     summary: ثبت پرداخت جزئی یا کامل از صندوق یا بانک
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: sourceType, required: true, schema: { type: string, enum: [FIXED_ASSET_ACQUISITION, PROJECT_EXPENSE, PRODUCTION_ORDER_COST] } }
 *       - { in: path, name: sourceId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, treasuryAccountId, method]
 *             properties:
 *               amount: { type: string, pattern: '^[1-9][0-9]{0,17}$', description: مبلغ به ریال }
 *               treasuryAccountId: { type: string, format: uuid }
 *               method: { type: string, enum: [CASH, BANK_TRANSFER, CHEQUE] }
 *               paidAt: { type: string, format: date }
 *               reference: { type: string, maxLength: 100 }
 *               note: { type: string, maxLength: 2000 }
 *     responses: { 201: { description: پرداخت و سند بدهکار پرداختنی/بستانکار خزانه ثبت شد }, 409: { description: پرداخت بیش از مانده یا موجودی ناکافی خزانه } }
 * /financial/payables/settlements/{settlementId}/reverse:
 *   post:
 *     tags: [Payables]
 *     summary: برگشت یک پرداخت با سند معکوس
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: settlementId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, minLength: 2, maxLength: 500 }
 *               paidAt: { type: string, format: date }
 *               reference: { type: string, maxLength: 100 }
 *     responses: { 201: { description: برگشت پرداخت و سند معکوس ثبت شد }, 409: { description: پرداخت قبلاً برگشت خورده است } }
 */
