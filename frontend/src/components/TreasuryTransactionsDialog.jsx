import { formatPersianDate } from '../utils/persianDate'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiAlertCircle, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import { api, getErrorMessage, unwrap } from '../services/api'

const money = (value) => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const jalaliDate = (value) => value ? formatPersianDate(`${String(value).slice(0, 10)}T12:00:00`) : '—'

export default function TreasuryTransactionsDialog({ account, onClose }) {
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['treasury-transactions', account.id, page], queryFn: async () => unwrap(await api.get(`/financial/treasury/accounts/${account.id}/transactions?page=${page}&limit=20`)) })
  const data = query.data
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card"><div className="modal-heading"><div><span className="eyebrow">گردش حساب خزانه</span><h2>{account.name} · {account.code}</h2></div><button className="icon-button" aria-label="بستن" onClick={onClose}><FiX/></button></div>
    <div className="financial-report-summary treasury-account-details"><span>نوع حساب: <b>{({ CASH: 'صندوق', BANK: 'بانک', PETTY_CASH: 'تنخواه' })[account.account_type] || '—'}</b></span>{account.description && <span>توضیحات: <b>{account.description}</b></span>}{account.bank_name && <span>نام بانک: <b>{account.bank_name}</b></span>}{account.branch_name && <span>نام شعبه: <b>{account.branch_name}</b></span>}{account.branch_code && <span>کد شعبه: <b>{account.branch_code}</b></span>}{account.bank_address && <span>نشانی شعبه: <b>{account.bank_address}</b></span>}{account.bank_phone && <span>تلفن شعبه: <b>{account.bank_phone}</b></span>}{account.account_number && <span>شماره حساب: <b>{account.account_number}</b></span>}{account.card_number && <span>شماره کارت: <b>{account.card_number}</b></span>}{account.iban && <span>شماره شبا: <b>{account.iban}</b></span>}{account.custodian_name && <span>مسئول تنخواه: <b>{account.custodian_name}</b></span>}{account.limit_amount && <span>سقف تنخواه: <b>{money(account.limit_amount)}</b></span>}</div>
    {query.isLoading ? <div className="loading-line"/> : query.isError ? <div className="error-state"><FiAlertCircle/><strong>دریافت گردش حساب انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div> : <>
      <div className="financial-report-summary"><span>مانده ابتدای بازه: <b>{money(data.opening_balance)}</b></span><strong>مانده فعلی: {money(data.current_balance ?? data.account?.balance ?? account.balance)}</strong></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>تاریخ</th><th>شماره سند</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th><th>مانده</th></tr></thead><tbody>{(data.items || []).map((row) => <tr key={row.id}><td>{jalaliDate(row.entry?.entry_date)}</td><td>{row.entry?.entry_no || '—'}</td><td>{row.description || row.entry?.description || '—'}</td><td className="number-cell">{money(row.debit)}</td><td className="number-cell">{money(row.credit)}</td><td className="number-cell">{money(row.running_balance)}</td></tr>)}{!data.items?.length && <tr><td colSpan="6">برای این حساب گردشی ثبت نشده است.</td></tr>}</tbody></table></div>
      <div className="table-footer"><span>صفحه {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(data.pagination?.totalPages || 0)}</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronRight/></button><button disabled={page >= (data.pagination?.totalPages || 1)} onClick={() => setPage(page + 1)}><FiChevronLeft/></button></div></div>
    </>}
    <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>بستن</button></div></section></div>
}
