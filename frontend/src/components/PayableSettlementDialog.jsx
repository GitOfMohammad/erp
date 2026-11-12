import { formatPersianDate } from '../utils/persianDate'
import SearchableSelect from './SearchableSelect'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertCircle, FiDollarSign, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import { fetchAllPages } from '../utils/fetchAllPages'
import FormattedNumberInput from './FormattedNumberInput'
import JalaliDateInput from './JalaliDateInput'

const money = (value) => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const today = new Intl.DateTimeFormat('en-CA').format(new Date())
const methodNames = { CASH: 'نقدی', BANK_TRANSFER: 'انتقال بانکی', CHEQUE: 'چک' }

export default function PayableSettlementDialog({ item, canSettle, canReverse, onClose }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [paidAt, setPaidAt] = useState(today)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const key = ['payable-detail', item.sourceType, item.sourceId]
  const detail = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.get(`/financial/payables/${item.sourceType}/${item.sourceId}`)) })
  const accounts = useQuery({ queryKey: ['active-treasury-accounts'], queryFn: async () => ({ items: await fetchAllPages('/financial/treasury/accounts?is_active=1') }) })
  const save = useMutation({ mutationFn: async () => unwrap(await api.post(`/financial/payables/${item.sourceType}/${item.sourceId}/settlements`, { amount: String(amount).replaceAll(',', ''), treasuryAccountId: accountId, method, paidAt, reference, note })), onSuccess: () => { toast.success('پرداخت ثبت شد'); queryClient.invalidateQueries({ queryKey: ['resource', '/financial/payables'] }); queryClient.invalidateQueries({ queryKey: key }) }, onError: (error) => toast.error(getErrorMessage(error)) })
  const reverse = useMutation({ mutationFn: async (settlementId) => { const reason = window.prompt('علت برگشت پرداخت را وارد کنید'); if (!reason?.trim()) throw new Error('برای برگشت، ذکر علت الزامی است'); return unwrap(await api.post(`/financial/payables/settlements/${settlementId}/reverse`, { reason: reason.trim(), paidAt: today })) }, onSuccess: () => { toast.success('پرداخت برگشت داده شد'); queryClient.invalidateQueries({ queryKey: ['resource', '/financial/payables'] }); queryClient.invalidateQueries({ queryKey: key }) }, onError: (error) => toast.error(getErrorMessage(error)) })
  const current = detail.data || item
  const accountRows = accounts.data?.items || []
  const filteredAccounts = accountRows.filter((account) => method === 'CASH' ? ['CASH', 'PETTY_CASH'].includes(account.account_type) : account.account_type === 'BANK')

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card"><div className="modal-heading"><div><span className="eyebrow">پرداختنی عملیاتی</span><h2>{item.reference} · {item.description}</h2></div><button className="icon-button" onClick={onClose} aria-label="بستن"><FiX/></button></div>
    {detail.isLoading || accounts.isLoading ? <div className="loading-line"/> : detail.isError || accounts.isError ? <div className="error-state"><FiAlertCircle/><strong>دریافت اطلاعات پرداخت انجام نشد</strong><span>{getErrorMessage(detail.error || accounts.error)}</span></div> : <>
      <div className="financial-report-summary"><span>مبلغ: <b>{money(current.amount)}</b></span><span>پرداخت‌شده: <b>{money(current.settledAmount)}</b></span><strong>مانده: {money(current.balanceDue)}</strong></div>
      {canSettle && BigInt(current.balanceDue || 0) > 0n && <form className="modal-form" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
        <label className="form-field"><span>مبلغ پرداخت (ریال)</span><FormattedNumberInput className="form-control" decimalScale={0} value={amount} onValueChange={setAmount} required /></label>
        <label className="form-field"><span>روش پرداخت</span><SearchableSelect className="form-control" value={method} onChange={(event) => { setMethod(event.target.value); setAccountId('') }}><option value="BANK_TRANSFER">انتقال بانکی</option><option value="CASH">نقدی</option><option value="CHEQUE">چک</option></SearchableSelect></label>
        <label className="form-field"><span>حساب خزانه</span><SearchableSelect className="form-control" value={accountId} onChange={(event) => setAccountId(event.target.value)} required><option value="">انتخاب حساب</option>{filteredAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · مانده {money(account.balance)}</option>)}</SearchableSelect></label>
        <label className="form-field"><span>تاریخ پرداخت</span><JalaliDateInput className="form-control" value={paidAt} onChange={setPaidAt} required /></label>
        <label className="form-field"><span>شماره پیگیری</span><input className="form-control" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        <label className="form-field"><span>یادداشت</span><input className="form-control" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="modal-actions"><button className="btn btn-primary" disabled={save.isPending || !accountId || !amount || BigInt(amount || 0) > BigInt(current.balanceDue)}><FiDollarSign/> ثبت پرداخت</button></div>
      </form>}
      <h3>سوابق پرداخت</h3><div className="table-scroll"><table className="data-table"><thead><tr><th>تاریخ</th><th>مبلغ</th><th>روش</th><th>شماره پیگیری</th><th>عملیات</th></tr></thead><tbody>{(current.settlements || []).map((entry) => <tr key={entry.id}><td>{new Date(entry.paid_at)}</td><td>{money(entry.amount)}</td><td>{entry.reverses_settlement_id ? 'برگشت پرداخت' : methodNames[entry.method] || entry.method}</td><td>{entry.reference || '—'}</td><td>{canReverse && !entry.reverses_settlement_id && <button className="btn btn-secondary" disabled={reverse.isPending} onClick={() => reverse.mutate(entry.id)}>برگشت پرداخت</button>}</td></tr>)}{!current.settlements?.length && <tr><td colSpan="5">هنوز پرداختی ثبت نشده است.</td></tr>}</tbody></table></div>
    </>}
    <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>بستن</button></div></section></div>
}
