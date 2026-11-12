import { formatPersianDate } from '../utils/persianDate'
import SearchableSelect from './SearchableSelect'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FiAlertCircle, FiRotateCcw } from 'react-icons/fi'
import FormattedNumberInput from './FormattedNumberInput'
import JalaliDateInput from './JalaliDateInput'
import { api, getErrorMessage, unwrap } from '../services/api'

const accountItems = (data) => Array.isArray(data) ? data : data?.items || data?.rows || []
const rial = (value) => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const methodNames = { CASH: 'نقدی', BANK_TRANSFER: 'انتقال بانکی', CHEQUE: 'چک', OTHER: 'سایر' }
const dateText = (value) => value ? formatPersianDate(value, true) : '—'

export default function CommercialSettlementsPanel({ invoice, documentType, canSettle }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [accountId, setAccountId] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Intl.DateTimeFormat('en-CA').format(new Date()))
  const basePath = documentType === 'PURCHASE_INVOICE' ? '/commercial/purchasing/invoices' : '/commercial/sales/invoices'
  const accountsPath = documentType === 'PURCHASE_INVOICE' ? '/commercial/purchasing/settlement-accounts' : '/commercial/sales/settlement-accounts'
  const detailKey = ['commercial-invoice-detail', documentType, invoice.id]
  const detailQuery = useQuery({ queryKey: detailKey, queryFn: async () => unwrap(await api.get(`${basePath}/${invoice.id}`)) })
  const accountsQuery = useQuery({ queryKey: ['settlement-accounts', documentType], queryFn: async () => unwrap(await api.get(accountsPath)), enabled: canSettle })
  const detail = detailQuery.data || invoice
  const financial = detail.financial || invoice.financial || {}
  const settlements = detail.settlements || []
  const action = BigInt(financial.balance_due || 0) > 0n ? 'SETTLE' : BigInt(financial.credit_balance || 0) > 0n ? 'REFUND' : ''
  const accounts = accountItems(accountsQuery.data)
  const preferredMethod = useMemo(() => accounts.some((account) => account.account_type === 'BANK') ? 'BANK_TRANSFER' : accounts.some((account) => ['CASH', 'PETTY_CASH'].includes(account.account_type)) ? 'CASH' : 'BANK_TRANSFER', [accounts])
  const selectedMethod = method || preferredMethod
  const availableAccounts = useMemo(() => accounts.filter((account) => selectedMethod === 'CASH' ? ['CASH', 'PETTY_CASH'].includes(account.account_type) : ['BANK_TRANSFER', 'CHEQUE'].includes(selectedMethod) ? account.account_type === 'BANK' : true), [accounts, selectedMethod])
  const reversedIds = new Set(settlements.map((entry) => entry.reverses_settlement_id).filter(Boolean))

  useEffect(() => {
    if (!availableAccounts.some((account) => account.id === accountId)) setAccountId(availableAccounts[0]?.id || '')
  }, [availableAccounts, accountId])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailKey }),
      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['resource'] }),
      queryClient.invalidateQueries({ queryKey: ['settlement-accounts'] }),
    ])
  }
  const saveSettlement = useMutation({
    mutationFn: async () => unwrap(await api.post(`${basePath}/${invoice.id}/settlements`, {
      action,
      treasuryAccountId: accountId,
      amount,
      method: selectedMethod,
      reference: reference.trim() || null,
      paidAt: paidAt || undefined,
      note: note.trim() || null,
    })),
    onSuccess: async () => {
      toast.success(action === 'REFUND' ? 'بازپرداخت ثبت شد' : documentType === 'PURCHASE_INVOICE' ? 'پرداخت ثبت شد' : 'دریافت ثبت شد')
      setAmount(''); setReference(''); setNote('')
      await refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const reverse = useMutation({
    mutationFn: async ({ settlementId, reason }) => unwrap(await api.post(`${basePath}/${invoice.id}/settlements/${settlementId}/reverse`, { reason })),
    onSuccess: async () => { toast.success('برگشت تسویه ثبت شد'); await refresh() },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const reverseEntry = (entry) => {
    const reason = window.prompt('دلیل برگشت این تسویه را وارد کنید:')
    if (reason?.trim()) reverse.mutate({ settlementId: entry.id, reason: reason.trim() })
  }

  return <section className="commercial-settlements" aria-label="تسویه فاکتور">
    <div className="commercial-settlements-heading"><div><strong>وضعیت تسویه</strong><span>{financial.payment_status === 'PAID' ? 'تسویه‌شده' : financial.payment_status === 'PARTIAL' ? 'تسویهٔ جزئی' : financial.payment_status === 'CREDIT' ? 'بستانکار' : 'تسویه‌نشده'}</span></div><div className="commercial-settlement-totals"><span>مبلغ فاکتور <b>{rial(financial.invoice_amount || detail.total_amount)}</b></span><span>تسویه‌شده <b>{rial(financial.paid_amount)}</b></span><span>ماندهٔ پرداخت <b>{rial(financial.balance_due)}</b></span>{BigInt(financial.credit_balance || 0) > 0n && <span>ماندهٔ بستانکاری <b>{rial(financial.credit_balance)}</b></span>}</div></div>

    {detailQuery.isLoading && <div className="loading-line" />}
    {detailQuery.isError && <div className="commercial-settlement-error"><FiAlertCircle /> دریافت جزئیات تسویه انجام نشد: {getErrorMessage(detailQuery.error)}</div>}

    {canSettle && detail.status === 'APPROVED' && action && <form className="commercial-settlement-form" onSubmit={(event) => { event.preventDefault(); if (!accountId || !/^[1-9]\d{0,17}$/.test(amount)) return; saveSettlement.mutate() }}>
      <strong>{action === 'REFUND' ? 'ثبت بازپرداخت' : documentType === 'PURCHASE_INVOICE' ? 'ثبت پرداخت' : 'ثبت دریافت'}</strong>
      <label><span>مبلغ (ریال)</span><FormattedNumberInput className="form-control" decimalScale={0} value={amount} onValueChange={setAmount} placeholder="مبلغ" /></label>
      <label><span>روش</span><SearchableSelect className="form-control" value={selectedMethod} onChange={(event) => setMethod(event.target.value)}><option value="BANK_TRANSFER">انتقال بانکی</option><option value="CASH">نقدی</option><option value="CHEQUE">چک</option><option value="OTHER">سایر</option></SearchableSelect></label>
      <label><span>حساب خزانه</span><SearchableSelect className="form-control" value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={accountsQuery.isLoading || !availableAccounts.length}><option value="">انتخاب حساب</option>{availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.account_type === 'CASH' ? 'صندوق' : account.account_type === 'PETTY_CASH' ? 'تنخواه' : 'بانک'})</option>)}</SearchableSelect></label>
      <label><span>تاریخ</span><JalaliDateInput className="form-control" value={paidAt} onChange={setPaidAt} /></label>
      <label><span>شماره پیگیری</span><input className="form-control" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} /></label>
      <label className="commercial-settlement-note"><span>یادداشت</span><input className="form-control" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {accountsQuery.isError && <small className="commercial-settlement-error">دریافت حساب‌های خزانه ناموفق بود: {getErrorMessage(accountsQuery.error)}</small>}
      {!accountsQuery.isLoading && !accountsQuery.isError && !availableAccounts.length && <small className="commercial-settlement-error">برای این روش، حساب خزانهٔ فعالی وجود ندارد.</small>}
      <button className="btn btn-primary" disabled={saveSettlement.isPending || accountsQuery.isLoading || accountsQuery.isError || !accountId || !/^[1-9]\d{0,17}$/.test(amount)}>{saveSettlement.isPending ? 'در حال ثبت…' : action === 'REFUND' ? 'ثبت بازپرداخت' : 'ثبت تسویه'}</button>
    </form>}

    {settlements.length > 0 && <div className="table-scroll commercial-settlements-table"><table className="data-table"><thead><tr><th>نوع عملیات</th><th>مبلغ</th><th>روش</th><th>حساب</th><th>تاریخ</th><th>مرجع</th><th>عملیات</th></tr></thead><tbody>{settlements.map((entry) => {
      const isReversal = Boolean(entry.reverses_settlement_id)
      const canReverse = canSettle && !isReversal && !reversedIds.has(entry.id)
      return <tr key={entry.id}><td>{isReversal ? 'برگشت تسویه' : entry.direction === (documentType === 'PURCHASE_INVOICE' ? 'OUT' : 'IN') ? documentType === 'PURCHASE_INVOICE' ? 'پرداخت' : 'دریافت' : 'بازپرداخت'}</td><td className="number-cell">{rial(entry.amount)}</td><td>{methodNames[entry.method] || entry.method}</td><td>{entry.treasuryAccount?.name || '—'}</td><td>{dateText(entry.paid_at)}</td><td>{entry.reference || '—'}</td><td>{canReverse ? <button type="button" className="btn btn-secondary commercial-settlement-reverse" disabled={reverse.isPending} onClick={() => reverseEntry(entry)}><FiRotateCcw /> برگشت</button> : '—'}</td></tr>
    })}</tbody></table></div>}
  </section>
}
