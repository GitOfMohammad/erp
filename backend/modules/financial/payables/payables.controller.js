'use strict';
const ResponseApi = require('../../../core/api/ResponseApi');
const service = require('./payables.service');
const c = {};
c.list = async (req, res, next) => { try { return ResponseApi.ok(res, { type: 'SUCCESS', message: 'فهرست پرداختنی‌ها دریافت شد', details: await service.listPayables(req.validated.query) }); } catch (e) { next(e); } };
c.get = async (req, res, next) => { try { const { sourceType, sourceId } = req.validated.params; return ResponseApi.ok(res, { type: 'SUCCESS', message: 'جزئیات پرداختنی دریافت شد', details: await service.getPayable(sourceType, sourceId) }); } catch (e) { next(e); } };
c.settle = async (req, res, next) => { try { const { sourceType, sourceId } = req.validated.params; return ResponseApi.created(res, { type: 'CREATED', message: 'پرداخت و سند حسابداری ثبت شد', details: await service.createSettlement(sourceType, sourceId, req.validated.body, req.user.id) }); } catch (e) { next(e); } };
c.reverse = async (req, res, next) => { try { return ResponseApi.created(res, { type: 'CREATED', message: 'برگشت پرداخت و سند معکوس ثبت شد', details: await service.reverseSettlement(req.params.settlementId, req.validated.body, req.user.id) }); } catch (e) { next(e); } };
module.exports = c;
