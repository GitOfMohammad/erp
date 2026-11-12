import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FiAlertCircle, FiCheck, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { NumericFormat } from 'react-number-format'
import { api, getErrorMessage, unwrap } from '../services/api'
import JalaliDateInput from '../components/JalaliDateInput'
import SearchableSelect from '../components/SearchableSelect'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'
import { formatPersianDate } from '../utils/persianDate'

const today = new Date().toISOString().slice(0, 10)
const money = value => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const signed = value => String(value || '0').replaceAll(',', '').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const faDate = value => value ? formatPersianDate(`${String(value).slice(0, 10)}T12:00:00`) : '—'
const reconciliationToExport = item => [item.treasuryAccount?.bank_name || 'بانک', item.treasuryAccount?.name || '', faDate(item.start_date), faDate(item.end_date), money(item.statement_opening_balance), money(item.statement_closing_balance), item.status === 'RECONCILED' ? 'نهایی‌شده' : 'پیش‌نویس']

function ReconciliationCandidateSelect({ reconciliationId, line, onMatch, disabled }) {
  const [opened, setOpened] = useState(false)
  const [search, setSearch] = useState('')
  const query = useQuery({
    queryKey: ['bank-reconciliation-candidates', reconciliationId, line.id, search],
    queryFn: async () => fetchAllPages(`/financial/bank-reconciliations/${reconciliationId}/candidates?lineId=${line.id}&search=${encodeURIComponent(search)}`),
    enabled: opened,
  })
  return <div>
    <SearchableSelect name={`reconciliation-match-${line.id}`} className="form-control" value="" options={query.data || []} onOpen={() => setOpened(true)} onSearch={setSearch} loading={query.isFetching} disabled={disabled} getOptionLabel={option => `${option.entryNo} · ${option.description}`} onChange={id => id && onMatch(id)} placeholder="جست‌وجوی سند هم‌مبلغ و هم‌تاریخ" emptyLabel="سند منطبق پیدا نشد" />
    {query.isError && <small className="inline-error">{getErrorMessage(query.error)}</small>}
  </div>
}

export default function BankReconciliationPage() {
  const user = useSelector(state => state.session.user)
  const canRead = user?.permissions?.includes('financial.treasury.read') || user?.rolename?.toLowerCase() === 'مدیر سایت'
  const canManage = user?.permissions?.includes('financial.reconciliation.manage') || user?.rolename?.toLowerCase() === 'مدیر سایت'
  const qc = useQueryClient()
  const [accountId, setAccountId] = useState('')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [opening, setOpening] = useState('0')
  const [closing, setClosing] = useState('0')
  const [activeId, setActiveId] = useState('')
  const [page, setPage] = useState(1)
  const [linesPage, setLinesPage] = useState(1)
  const [lineDate, setLineDate] = useState(today)
  const [lineDescription, setLineDescription] = useState('')
  const [lineReference, setLineReference] = useState('')
  const [lineAmount, setLineAmount] = useState('')
  const accounts = useQuery({ queryKey: ['reconciliation-bank-accounts'], queryFn: async () => ({ items: await fetchAllPages('/financial/treasury/accounts?accountType=BANK&is_active=1') }), enabled: canRead })
  const list = useQuery({ queryKey: ['bank-reconciliations', page], queryFn: async () => unwrap(await api.get(`/financial/bank-reconciliations?page=${page}&limit=20`)), enabled: canRead })
  const detail = useQuery({ queryKey: ['bank-reconciliation', activeId], queryFn: async () => unwrap(await api.get(`/financial/bank-reconciliations/${activeId}`)), enabled: canRead && Boolean(activeId) })
  const lines = useQuery({ queryKey: ['bank-reconciliation-lines', activeId, linesPage], queryFn: async () => unwrap(await api.get(`/financial/bank-reconciliations/${activeId}/lines?page=${linesPage}&limit=20`)), enabled: canRead && Boolean(activeId) })
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ['bank-reconciliations'] }); await qc.invalidateQueries({ queryKey: ['bank-reconciliation', activeId] }); await qc.invalidateQueries({ queryKey: ['bank-reconciliation-lines', activeId] }); await qc.invalidateQueries({ queryKey: ['bank-reconciliation-candidates', activeId] }) }
  const create = useMutation({ mutationFn: async () => unwrap(await api.post('/financial/bank-reconciliations', { treasuryAccountId: accountId, startDate: from, endDate: to, statementOpeningBalance: signed(opening), statementClosingBalance: signed(closing) })), onSuccess: async result => { setLinesPage(1); setActiveId(result.id); await refresh() } })
  const addLine = useMutation({ mutationFn: async () => unwrap(await api.post(`/financial/bank-reconciliations/${activeId}/lines`, { transactionDate: lineDate, description: lineDescription, reference: lineReference, amount: signed(lineAmount) })), onSuccess: async () => { setLineDescription(''); setLineReference(''); setLineAmount(''); setLinesPage(1); await refresh() } })
  const match = useMutation({ mutationFn: async ({ lineId, journalLineId }) => unwrap(await api.put(`/financial/bank-reconciliations/${activeId}/lines/${lineId}/match`, { journalLineId })), onSuccess: refresh })
  const deleteLine = useMutation({ mutationFn: async lineId => unwrap(await api.delete(`/financial/bank-reconciliations/${activeId}/lines/${lineId}`)), onSuccess: async () => { if (lines.data?.items?.length === 1 && linesPage > 1) setLinesPage(value => value - 1); await refresh() } })
  const finalize = useMutation({ mutationFn: async () => unwrap(await api.post(`/financial/bank-reconciliations/${activeId}/finalize`)), onSuccess: refresh })
  const selected = detail.data
  const summary = selected?.summary
  const accountItems = accounts.data?.items || []
  const loadExportRows = async () => (await fetchAllPages('/financial/bank-reconciliations')).map(reconciliationToExport)
  return <section className="resource-page bank-reconciliation-page">
    <header className="page-heading"><div><div className="eyebrow">خزانه‌داری</div><h1>مغایرت‌گیری بانکی</h1><p>ردیف‌های صورت‌حساب بانکی را وارد و با اسناد دفتر کل تطبیق دهید. این صفحه به بانک متصل نمی‌شود.</p></div><button className="btn btn-secondary" onClick={() => { list.refetch(); if (activeId) detail.refetch() }}><FiRefreshCw/> به‌روزرسانی</button></header>
    {!canRead ? <div className="error-state"><FiAlertCircle/><strong>دسترسی به مغایرت‌گیری بانکی ندارید</strong></div> : <>
      <section className="panel"><div className="section-heading"><div><h2>دورهٔ جدید</h2><p>مانده‌های آغاز و پایان را مطابق صورت‌حساب وارد کنید.</p></div></div><div className="financial-report-filters">
        <label className="form-field"><span>حساب بانکی</span><SearchableSelect className="form-control" value={accountId} onChange={event => setAccountId(event.target.value)}><option value="">انتخاب حساب</option>{accountItems.map(account => <option key={account.id} value={account.id}>{account.bank_name || 'بانک'} · {account.name}</option>)}</SearchableSelect></label>
        <label className="form-field"><span>از تاریخ</span><JalaliDateInput className="form-control" value={from} onChange={setFrom}/></label><label className="form-field"><span>تا تاریخ</span><JalaliDateInput className="form-control" value={to} onChange={setTo}/></label>
        <label className="form-field"><span>ماندهٔ آغازین (ریال)</span><NumericFormat className="form-control" value={opening} thousandSeparator="٬" onValueChange={value => setOpening(value.value)} /></label><label className="form-field"><span>ماندهٔ پایانی (ریال)</span><NumericFormat className="form-control" value={closing} thousandSeparator="٬" onValueChange={value => setClosing(value.value)} /></label>
      </div><button className="btn btn-primary" disabled={!canManage || create.isPending || !accountId || from > to} onClick={() => create.mutate()}>ایجاد دوره</button>{create.isError && <div className="inline-error">{getErrorMessage(create.error)}</div>}</section>
    <div className="panel"><div className="section-heading"><div><h2>دوره‌های مغایرت‌گیری</h2><p>{new Intl.NumberFormat('fa-IR').format(list.data?.pagination?.totalItems || 0)} دوره ثبت‌شده</p></div><DataExportActions title="دوره‌های مغایرت‌گیری بانکی" headers={['بانک','حساب','از تاریخ','تا تاریخ','مانده آغازین','مانده پایانی','وضعیت']} loadRows={loadExportRows} subtitle="همهٔ دوره‌های ثبت‌شده"/></div><div className="table-scroll"><table className="data-table"><thead><tr><th>حساب بانکی</th><th>بازه</th><th>مانده پایان</th><th>وضعیت</th><th></th></tr></thead><tbody>{(list.data?.items || []).map(item => <tr key={item.id}><td>{item.treasuryAccount?.bank_name} · {item.treasuryAccount?.name}</td><td>{faDate(item.start_date)} تا {faDate(item.end_date)}</td><td>{money(item.statement_closing_balance)}</td><td>{item.status === 'RECONCILED' ? 'نهایی‌شده' : 'پیش‌نویس'}</td><td><button className="btn btn-secondary" onClick={() => { setLinesPage(1); setActiveId(item.id) }}>بازکردن</button></td></tr>)}</tbody></table></div><div className="table-footer"><span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(Math.max(1, list.data?.pagination?.totalPages || 1))}</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>صفحهٔ قبل</button><button disabled={page >= (list.data?.pagination?.totalPages || 1)} onClick={() => setPage(value => value + 1)}>صفحهٔ بعد</button></div></div></div>
      {selected && <section className="panel"><div className="section-heading"><div><h2>{selected.treasuryAccount?.bank_name} · {selected.treasuryAccount?.name}</h2><p>{faDate(selected.start_date)} تا {faDate(selected.end_date)} · {selected.status === 'RECONCILED' ? 'نهایی شده' : 'پیش‌نویس'}</p></div></div>
        {selected.status === 'DRAFT' && <><div className="financial-report-filters"><label className="form-field"><span>تاریخ ردیف</span><JalaliDateInput className="form-control" value={lineDate} onChange={setLineDate}/></label><label className="form-field"><span>شرح</span><input className="form-control" value={lineDescription} onChange={event => setLineDescription(event.target.value)}/></label><label className="form-field"><span>شماره مرجع</span><input className="form-control" value={lineReference} onChange={event => setLineReference(event.target.value)}/></label><label className="form-field"><span>مبلغ (واریز مثبت، برداشت منفی)</span><NumericFormat className="form-control" value={lineAmount} thousandSeparator="٬" allowNegative onValueChange={value => setLineAmount(value.value)}/></label></div><button className="btn btn-secondary" disabled={!canManage || addLine.isPending || !lineDescription || !lineAmount} onClick={() => addLine.mutate()}>افزودن ردیف صورت‌حساب</button></>}
        {lines.isLoading && <div className="loading-line"/>}
        {lines.isError && <div className="error-state"><FiAlertCircle/><strong>دریافت ردیف‌های صورت‌حساب انجام نشد</strong><span>{getErrorMessage(lines.error)}</span><button className="btn btn-secondary" onClick={() => lines.refetch()}>تلاش دوباره</button></div>}
        {!lines.isLoading && !lines.isError && (lines.data?.pagination?.totalItems || 0) === 0 && <div className="empty-state">هنوز ردیفی از صورت‌حساب ثبت نشده است.</div>}
        {(lines.data?.items || []).length > 0 && <div className="table-scroll"><table className="data-table"><thead><tr><th>تاریخ</th><th>شرح</th><th>مرجع</th><th>مبلغ</th><th>وضعیت تطبیق</th><th>عملیات</th></tr></thead><tbody>{lines.data.items.map(line => <tr key={line.id}><td>{faDate(line.transaction_date)}</td><td>{line.description}</td><td>{line.reference || '—'}</td><td>{money(line.amount)}</td><td>{line.matched_journal_line_id ? `تطبیق: ${line.matchedJournalLine?.entry?.entry_no || 'انجام شد'}` : <ReconciliationCandidateSelect reconciliationId={activeId} line={line} disabled={!canManage || selected.status !== 'DRAFT' || match.isPending} onMatch={journalLineId => match.mutate({ lineId: line.id, journalLineId })}/>}</td><td>{canManage && selected.status === 'DRAFT' ? <button className="btn btn-secondary" type="button" aria-label="حذف ردیف صورت‌حساب" title="حذف ردیف و افزودن دوباره" disabled={deleteLine.isPending} onClick={() => { if (window.confirm('این ردیف صورت‌حساب حذف شود؟ می‌توانید آن را دوباره با اطلاعات درست ثبت کنید.')) deleteLine.mutate(line.id) }}><FiTrash2/> حذف</button> : '—'}</td></tr>)}</tbody></table></div>}
        {(lines.data?.pagination?.totalPages || 0) > 1 && <div className="table-footer"><span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(linesPage)} از {new Intl.NumberFormat('fa-IR').format(lines.data.pagination.totalPages)} · {new Intl.NumberFormat('fa-IR').format(lines.data.pagination.totalItems)} ردیف</span><div className="pagination"><button disabled={linesPage <= 1} onClick={() => setLinesPage(value => value - 1)}>صفحهٔ قبل</button><button disabled={linesPage >= lines.data.pagination.totalPages} onClick={() => setLinesPage(value => value + 1)}>صفحهٔ بعد</button></div></div>}
        {summary && <div className="financial-report-summary"><span>مانده دفتر کل: <b>{money(summary.bookClosing)}</b></span><span>مانده صورت‌حساب: <b>{money(summary.statementClosing)}</b></span><span>تعدیلات اقلام در راه: <b>{money(summary.unmatchedBookNet)}</b></span><span>اختلاف پس از تعدیل: <b>{money(summary.difference)}</b></span><span>ردیف‌های صورت‌حساب تطبیق‌نیافته: <b>{summary.unmatchedStatementLines}</b></span></div>}
        {summary?.unmatchedBookCount > 0 && <p className="muted-copy">اقلام ثبت‌شده در دفتر کل که هنوز در صورت‌حساب دیده نشده‌اند، به‌عنوان اقلام در راه در تعدیل لحاظ شده‌اند.</p>}
      {selected.status === 'DRAFT' && <button className="btn btn-primary" disabled={!canManage || finalize.isPending || !summary || summary.unmatchedStatementLines > 0 || BigInt(summary?.difference || 1) !== 0n || BigInt(summary?.statementInputDifference || 1) !== 0n} onClick={() => { if (window.confirm('این مغایرت بانکی نهایی شود؟ پس از نهایی‌سازی قابل ویرایش نخواهد بود.')) finalize.mutate() }}><FiCheck/> نهایی‌سازی مغایرت</button>}
        {[create, addLine, match, deleteLine, finalize].some(mutation => mutation.isError) && <div className="inline-error">{getErrorMessage([create, addLine, match, deleteLine, finalize].find(mutation => mutation.isError)?.error)}</div>}
      </section>}
    </>}
  </section>
}
