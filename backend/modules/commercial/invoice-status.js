const ErrorApi = require('../../core/api/ErrorApi');

const INVOICE_STATUS = Object.freeze({
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const ALLOWED_DECISIONS = Object.freeze({
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
});

function assertPendingApproval(invoice) {
  if (!invoice || invoice.status !== INVOICE_STATUS.PENDING_APPROVAL) {
    throw ErrorApi.conflict('فقط فاکتور در انتظار تأیید قابل بررسی است', {
      currentStatus: invoice?.status ?? null,
    });
  }
}

module.exports = { INVOICE_STATUS, ALLOWED_DECISIONS, assertPendingApproval };
