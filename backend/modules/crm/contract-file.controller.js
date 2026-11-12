const path = require('node:path');
const env = require('../../core/config/env');
const ErrorApi = require('../../core/api/ErrorApi');
const service = require('./crm.service');

module.exports = async function downloadContractFile(req, res, next) {
  try {
    const contract = await service.getContract(req.params.id);
    const storedPath = String(contract.file_path || '').replace(/\\/g, '/');
    if (!/^pdfs\/[0-9a-f-]+\.pdf$/i.test(storedPath)) {
      throw ErrorApi.notFound('فایل قرارداد پیدا نشد');
    }

    const root = path.resolve(env.uploads.directory);
    const filePath = path.resolve(root, ...storedPath.split('/'));
    const relative = path.relative(root, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw ErrorApi.notFound('فایل قرارداد پیدا نشد');
    }

    return res.sendFile(filePath, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="contract-' + req.params.id + '.pdf"',
      },
    });
  } catch (error) {
    return next(error);
  }
};