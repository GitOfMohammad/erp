import SearchableSelect from '../components/SearchableSelect'
import DataExportActions from '../components/DataExportActions'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertCircle, FiRefreshCw, FiDownload, FiPrinter } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { api, getErrorMessage, unwrap } from '../services/api'
import JalaliDateInput from '../components/JalaliDateInput'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import { downloadExcel, printPdf } from '../utils/exportDocuments'
import { formatPersianDate } from '../utils/persianDate'
import { fetchAllPages } from '../utils/fetchAllPages'

const isoLocal = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = isoLocal(new Date())
const currentJalaliYearStart = new DateObject({ calendar: persian }).set({ month: 1, day: 1 }).toDate()
const yearStart = isoLocal(currentJalaliYearStart)
const money = (value) => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const faDate = (value) => value ? formatPersianDate(`${String(value).slice(0, 10)}T12:00:00`) : '—'
const reportTypes = [
  { value: 'trial-balance', label: 'تراز آزمایشی' },
  { value: 'balance-sheet', label: 'ترازنامه' },
  { value: 'income-statement', label: 'سود و زیان' },
]

export default function FinancialReportsPage() {
  const user = useSelector((state) => state.session.user)
  const canRead = user?.permissions?.includes('financial.reports.read') || user?.rolename?.toLowerCase() === 'مدیر سایت'
  const canClose = user?.permissions?.includes('financial.fiscal-years.close') || user?.rolename?.toLowerCase() === 'مدیر سایت'
  const queryClient = useQueryClient()
  const [type, setType] = useState('trial-balance')
  const [asOf, setAsOf] = useState(today)
  const [from, setFrom] = useState(yearStart)
  const [to, setTo] = useState(today)
  const [reportPage, setReportPage] = useState(1)
  const [fiscalName, setFiscalName] = useState('')
  const [fiscalStart, setFiscalStart] = useState(yearStart)
  const [fiscalEnd, setFiscalEnd] = useState(today)
  const [retainedAccountId, setRetainedAccountId] = useState('')
  const [fiscalPreview, setFiscalPreview] = useState(null)
  const accountsQuery = useQuery({ queryKey: ['fiscal-equity-accounts'], queryFn: async () => ({ items: await fetchAllPages('/financial/gl/accounts?accountType=EQUITY&is_active=1') }), enabled: canClose })
  const fiscalYearsQuery = useQuery({ queryKey: ['fiscal-years'], queryFn: async () => unwrap(await api.get('/financial/gl/fiscal-years')), enabled: canClose })
  const fiscalPayload = { name: fiscalName, startDate: fiscalStart, endDate: fiscalEnd, retainedEarningsAccountId: retainedAccountId }
  const fiscalPreviewMutation = useMutation({ mutationFn: async () => unwrap(await api.post('/financial/gl/fiscal-years/preview-close', fiscalPayload)), onSuccess: setFiscalPreview })
  const fiscalCloseMutation = useMutation({ mutationFn: async () => unwrap(await api.post('/financial/gl/fiscal-years/close', fiscalPayload)), onSuccess: async () => { setFiscalPreview(null); await queryClient.invalidateQueries({ queryKey: ['fiscal-years'] }); await queryClient.invalidateQueries({ queryKey: ['financial-report'] }) } })
  const queryString = type === 'income-statement' ? `from=${from}&to=${to}` : `asOf=${asOf}`
  const report = useQuery({
    queryKey: ['financial-report', type, asOf, from, to],
    queryFn: async () => unwrap(await api.get(`/financial/gl/reports/${type}?${queryString}`)),
    enabled: canRead && (type !== 'income-statement' || Boolean(from && to && from <= to)),
  })
  const rows = type === 'trial-balance' ? report.data?.accounts || [] : type === 'balance-sheet' ? report.data?.accounts || [] : [...(report.data?.revenue || []), ...(report.data?.expenses || [])]
  const reportPageSize = 25
  const reportTotalPages = Math.max(1, Math.ceil(rows.length / reportPageSize))
  const currentReportPage = Math.min(reportPage, reportTotalPages)
  const visibleRows = rows.slice((currentReportPage - 1) * reportPageSize, currentReportPage * reportPageSize)
  const amountFor = (row, key) => {
    if (type === 'trial-balance') return row[key]
    if (type === 'balance-sheet') return row.balance
    return row.balance
  }
  const accountTypeLabel = value => ({ ASSET: 'دارایی', LIABILITY: 'بدهی', EQUITY: 'حقوق صاحبان سهام', REVENUE: 'درآمد', EXPENSE: 'هزینه', MEMORANDUM: 'انتظامی و آماری' })[value] || value || '—'
  const exportData = () => {
    if (type === 'trial-balance') return { headers: ['کد حساب', 'عنوان حساب', 'ماهیت', 'جمع بدهکار', 'جمع بستانکار', 'مانده بدهکار', 'مانده بستانکار'], rows: rows.map(row => [row.code, row.name, accountTypeLabel(row.account_type), money(row.debit_total), money(row.credit_total), money(row.debit_balance), money(row.credit_balance)]), summary: [['جمع بدهکار', money(report.data?.totalDebit)], ['جمع بستانکار', money(report.data?.totalCredit)], ['وضعیت تراز', report.data?.balanced ? 'تراز است' : 'تراز نیست']] }
    if (type === 'balance-sheet') return { headers: ['کد حساب', 'عنوان حساب', 'ماهیت', 'مانده (ریال)'], rows: rows.map(row => [row.code, row.name, accountTypeLabel(row.accountType), money(row.balance)]), summary: [['جمع دارایی', money(report.data?.totalAssets)], ['جمع بدهی و حقوق مالکانه', money(report.data?.liabilitiesAndEquity)], ['وضعیت تراز', report.data?.balanced ? 'تراز است' : 'تراز نیست']] }
    return { headers: ['کد حساب', 'عنوان حساب', 'گروه', 'مانده (ریال)'], rows: rows.map(row => [row.code, row.name, report.data.revenue?.includes(row) ? 'درآمد' : 'هزینه', money(row.balance)]), summary: [['جمع درآمد', money(report.data?.totalRevenue)], ['جمع هزینه', money(report.data?.totalExpenses)], ['سود / زیان خالص', money(report.data?.netIncome)]] }
  }
  const exportReport = async format => {
    if (!report.data || report.isLoading) return
    const { headers, rows: dataRows, summary } = exportData()
    const reportTitle = reportTypes.find(item => item.value === type)?.label || 'گزارش مالی'
    const subtitle = type === 'income-statement' ? `از ${faDate(from)} تا ${faDate(to)}` : `تا تاریخ ${faDate(asOf)}`
    if (format === 'excel') await downloadExcel(`گزارش-${reportTitle}`, 'گزارش', headers, dataRows, { subtitle, summary })
    else if (!printPdf(reportTitle, headers, dataRows, { subtitle, summary })) window.alert('اجازهٔ بازشدن پنجرهٔ چاپ را در مرورگر فعال کنید')
  }
  const requestFiscalPreview = () => {
    if (!fiscalName.trim() || !fiscalStart || !fiscalEnd || fiscalStart > fiscalEnd || !retainedAccountId) return
    setFiscalPreview(null)
    fiscalPreviewMutation.mutate()
  }
  const fiscalPreviewMatchesForm = fiscalPreview?.name === fiscalName && fiscalPreview?.startDate === fiscalStart && fiscalPreview?.endDate === fiscalEnd && fiscalPreview?.retainedEarningsAccount?.id === retainedAccountId
  const closeFiscalYear = () => {
    if (!fiscalPreviewMatchesForm || !fiscalPreview?.balanced || !fiscalPreview.lines?.length) return
    if (window.confirm(`با بستن «${fiscalName}»، سند اختتامیه ثبت و ثبت اسناد در بازهٔ ${fiscalStart} تا ${fiscalEnd} مسدود می‌شود. ادامه می‌دهید؟`)) fiscalCloseMutation.mutate()
  }

  return <section className="resource-page">
    <header className="page-heading"><div><div className="eyebrow">مالی و حسابداری</div><h1>گزارش‌های مالی</h1><p>گزارش‌ها از اسناد قطعی دفتر کل محاسبه می‌شوند و مبالغ به ریال هستند.</p></div></header>
    <div className="panel resource-panel">
      <div className="table-toolbar financial-report-toolbar">
        <div className="financial-report-filters">
          <label className="form-field"><span>نوع گزارش</span><SearchableSelect className="form-control" value={type} onChange={(event) => { setReportPage(1); setType(event.target.value) }}>{reportTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</SearchableSelect></label>
          {type === 'income-statement' ? <><label className="form-field"><span>از تاریخ</span><JalaliDateInput className="form-control" value={from} maxDate={to ? new Date(`${to}T12:00:00`) : undefined} onChange={value => { setReportPage(1); setFrom(value) }} /></label><label className="form-field"><span>تا تاریخ</span><JalaliDateInput className="form-control" value={to} minDate={from ? new Date(`${from}T12:00:00`) : undefined} onChange={value => { setReportPage(1); setTo(value) }} /></label></> : <label className="form-field"><span>تا تاریخ</span><JalaliDateInput className="form-control" value={asOf} onChange={value => { setReportPage(1); setAsOf(value) }} /></label>}
        </div>
        <div className="financial-report-actions"><button className="btn btn-secondary" type="button" onClick={() => exportReport('excel')} disabled={!canRead || report.isLoading || !report.data}><FiDownload/> Excel</button><button className="btn btn-secondary" type="button" onClick={() => exportReport('pdf')} disabled={!canRead || report.isLoading || !report.data}><FiPrinter/> PDF</button><button className="btn btn-secondary" type="button" onClick={() => report.refetch()} disabled={!canRead || report.isFetching}><FiRefreshCw/> به‌روزرسانی</button></div>
      </div>
      {!canRead ? <div className="error-state"><FiAlertCircle/><strong>دسترسی به گزارش‌های مالی ندارید</strong></div> : report.isError ? <div className="error-state"><FiAlertCircle/><strong>دریافت گزارش انجام نشد</strong><span>{getErrorMessage(report.error)}</span><button className="btn btn-secondary" onClick={() => report.refetch()}>تلاش دوباره</button></div> : <>
        {report.isLoading ? <div className="loading-line"/> : <><div className="table-scroll"><table className="data-table"><thead><tr>{type === 'income-statement' ? <><th>کد حساب</th><th>عنوان حساب</th><th>گروه</th><th>مانده (ریال)</th></> : type === 'balance-sheet' ? <><th>کد حساب</th><th>عنوان حساب</th><th>ماهیت</th><th>مانده (ریال)</th></> : <><th>کد حساب</th><th>عنوان حساب</th><th>ماهیت</th><th>جمع بدهکار</th><th>جمع بستانکار</th><th>مانده بدهکار</th><th>مانده بستانکار</th></>}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td>{type === 'income-statement' ? <><td>{report.data.revenue?.includes(row) ? 'درآمد' : 'هزینه'}</td><td className="number-cell">{money(amountFor(row, 'balance'))}</td></> : type === 'balance-sheet' ? <><td>{row.accountType}</td><td className="number-cell">{money(row.balance)}</td></> : <><td>{row.account_type}</td><td className="number-cell">{money(row.debit_total)}</td><td className="number-cell">{money(row.credit_total)}</td><td className="number-cell">{money(row.debit_balance)}</td><td className="number-cell">{money(row.credit_balance)}</td></>}</tr>)}</tbody></table></div><div className="table-footer"><span>نمایش <b>{new Intl.NumberFormat('fa-IR').format(rows.length ? (currentReportPage - 1) * reportPageSize + 1 : 0)} تا {new Intl.NumberFormat('fa-IR').format(Math.min(currentReportPage * reportPageSize, rows.length))}</b> از <b>{new Intl.NumberFormat('fa-IR').format(rows.length)}</b> حساب</span><div className="pagination"><button type="button" aria-label="صفحهٔ قبل" disabled={currentReportPage <= 1} onClick={() => setReportPage(page => Math.max(1, page - 1))}>قبلی</button><span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(currentReportPage)} از {new Intl.NumberFormat('fa-IR').format(reportTotalPages)}</span><button type="button" aria-label="صفحهٔ بعد" disabled={currentReportPage >= reportTotalPages} onClick={() => setReportPage(page => Math.min(reportTotalPages, page + 1))}>بعدی</button></div></div></>}
        {!report.isLoading && <div className="financial-report-summary">{type === 'trial-balance' ? <><span>جمع بدهکار: <b>{money(report.data?.totalDebit)}</b></span><span>جمع بستانکار: <b>{money(report.data?.totalCredit)}</b></span><strong className={report.data?.balanced ? 'status-green' : 'status-red'}>{report.data?.balanced ? 'تراز است' : 'تراز نیست'}</strong></> : type === 'balance-sheet' ? <><span>جمع دارایی: <b>{money(report.data?.totalAssets)}</b></span><span>جمع بدهی و حقوق مالکانه: <b>{money(report.data?.liabilitiesAndEquity)}</b></span><strong className={report.data?.balanced ? 'status-green' : 'status-red'}>{report.data?.balanced ? 'تراز است' : 'تراز نیست'}</strong></> : <><span>جمع درآمد: <b>{money(report.data?.totalRevenue)}</b></span><span>جمع هزینه: <b>{money(report.data?.totalExpenses)}</b></span><strong>سود/زیان خالص: {money(report.data?.netIncome)}</strong></>}</div>}
      </>}
    </div>
    {canClose && <section className="panel fiscal-close-panel">
      <div className="section-heading"><div><h2>بستن سال مالی</h2><p>ابتدا پیش‌نمایش سند اختتامیه را ببینید. پس از بستن، ثبت سند در این بازهٔ زمانی مسدود می‌شود.</p></div>{!!fiscalYearsQuery.data?.length && <DataExportActions title="دوره‌های مالی بسته‌شده" headers={['نام دوره','تاریخ شروع','تاریخ پایان','شناسه سند اختتامیه','وضعیت']} rows={fiscalYearsQuery.data.map(year => [year.name, faDate(year.start_date), faDate(year.end_date), year.closing_journal_entry_id || '—', 'بسته‌شده'])}/>}</div>
      <div className="financial-report-filters">
        <label className="form-field"><span>عنوان دوره</span><input className="form-control" value={fiscalName} onChange={event => setFiscalName(event.target.value)} placeholder="مثلاً سال مالی ۱۴۰۵" /></label>
        <label className="form-field"><span>از تاریخ</span><JalaliDateInput className="form-control" value={fiscalStart} onChange={setFiscalStart} /></label>
        <label className="form-field"><span>تا تاریخ</span><JalaliDateInput className="form-control" value={fiscalEnd} onChange={setFiscalEnd} /></label>
        <label className="form-field"><span>حساب مقصد سود و زیان</span><SearchableSelect className="form-control" value={retainedAccountId} onChange={event => setRetainedAccountId(event.target.value)}><option value="">انتخاب حساب حقوق صاحبان سهام</option>{(accountsQuery.data?.items || []).filter(account => account.is_postable).map(account => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</SearchableSelect></label>
      </div>
      <div className="financial-report-actions"><button className="btn btn-secondary" type="button" onClick={requestFiscalPreview} disabled={!canClose || fiscalPreviewMutation.isPending || !fiscalName.trim() || !retainedAccountId}>پیش‌نمایش سند اختتامیه</button></div>
      {fiscalPreviewMutation.isError && <div className="inline-error">{getErrorMessage(fiscalPreviewMutation.error)}</div>}
      {fiscalPreview && <div className="financial-report-summary"><span>سود / زیان خالص: <b>{money(fiscalPreview.netIncome)}</b></span><span>بدهکار: <b>{money(fiscalPreview.totalDebit)}</b></span><span>بستانکار: <b>{money(fiscalPreview.totalCredit)}</b></span><strong className={fiscalPreview.balanced ? 'status-green' : 'status-red'}>{fiscalPreview.balanced ? 'سند تراز است' : 'سند تراز نیست'}</strong><button className="btn btn-danger" type="button" onClick={closeFiscalYear} disabled={!fiscalPreviewMatchesForm || !fiscalPreview.balanced || !fiscalPreview.lines?.length || fiscalCloseMutation.isPending}>ثبت سند و بستن دوره</button>{!fiscalPreviewMatchesForm && <span>برای بستن، با تنظیمات فعلی دوباره پیش‌نمایش بگیرید.</span>}</div>}
      {fiscalCloseMutation.isError && <div className="inline-error">{getErrorMessage(fiscalCloseMutation.error)}</div>}
      {!!fiscalYearsQuery.data?.length && <div className="table-scroll"><table className="data-table"><thead><tr><th>دورهٔ بسته‌شده</th><th>شروع</th><th>پایان</th><th>سند اختتامیه</th></tr></thead><tbody>{fiscalYearsQuery.data.map(year => <tr key={year.id}><td>{year.name}</td><td>{faDate(year.start_date)}</td><td>{faDate(year.end_date)}</td><td>{year.closing_journal_entry_id || '—'}</td></tr>)}</tbody></table></div>}
    </section>}
  </section>
}
