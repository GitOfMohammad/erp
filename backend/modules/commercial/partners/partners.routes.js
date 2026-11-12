/**
 * @swagger
 * tags:
 *   - name: Commercial Partners
 *     description: مشتریان و تأمین‌کنندگان
 * /commercial/partners:
 *   get:
 *     summary: فهرست مشتریان و تأمین‌کنندگان
 *     tags: [Commercial Partners]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: فهرست طرف‌حساب‌ها } }
 *   post:
 *     summary: ایجاد مشتری یا تأمین‌کننده
 *     tags: [Commercial Partners]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: طرف‌حساب ایجاد شد } }
 * /commercial/partners/{id}:
 *   get:
 *     summary: جزئیات طرف‌حساب
 *     tags: [Commercial Partners]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: طرف‌حساب } }
 *   patch:
 *     summary: ویرایش یا غیرفعال‌کردن طرف‌حساب
 *     tags: [Commercial Partners]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: طرف‌حساب ویرایش شد } }
 *   delete:
 *     summary: حذف نرم طرف‌حساب
 *     tags: [Commercial Partners]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: طرف‌حساب حذف نرم شد } }
 */
const {Router}=require('express');const auth=require('../../../core/middlewares/authenticate');const permit=require('../../../core/middlewares/authorization');const validate=require('../../../core/middlewares/schemaValidator');const id=require('../../../core/middlewares/idValidator');const v=require('./partners.validator');const c=require('./partners.controller');const r=Router();r.use(auth);r.get('/',permit('commercial.partners.read'),validate(v.list,'query'),c.list);r.post('/',permit('commercial.partners.manage'),validate(v.create),c.create);r.get('/:id',permit('commercial.partners.read'),id(),c.get);r.patch('/:id',permit('commercial.partners.manage'),id(),validate(v.update),c.update);r.delete('/:id',permit('commercial.partners.manage'),id(),c.remove);module.exports=r;