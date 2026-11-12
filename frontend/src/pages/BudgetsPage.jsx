import SearchableSelect from '../components/SearchableSelect'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FiAlertCircle, FiBarChart2, FiCheck, FiEdit2, FiEye, FiPlus, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import JalaliDateInput from '../components/JalaliDateInput'
import { formatPersianDate, formatPersianMonth } from '../utils/persianDate'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'

const money = value => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const monthLabel = value => value ? formatPersianMonth(value) : '—'
const statusLabels = { DRAFT: 'پیش‌نویس', APPROVED: 'تأییدشده', CLOSED: 'بسته‌شده' }

function Modal({ title, onClose, children, wide = false }) {
  return <div className="budget-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className={`budget-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="بستن"><FiX /></button></header>{children}</section></div>
}

export default function BudgetsPage() {
  const user = useSelector(state => state.session.user)
  const permissions = user?.permissions || []
  const admin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const allowed = permission => admin || permissions.includes(permission)
  const canRead = allowed('financial.budgets.read')
  const canCreate = allowed('financial.budgets.create')
  const canUpdate = allowed('financial.budgets.update')
  const canDelete = allowed('financial.budgets.delete')
  const canApprove = allowed('financial.budgets.approve')
  const canClose = allowed('financial.budgets.close')
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [editor, setEditor] = useState(null)
  const [lineEditor, setLineEditor] = useState(null)
  const [report, setReport] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const base = '/financial/budgets'
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); queryClient.invalidateQueries({ queryKey: ['budget-detail'] }) }
  const listQuery = useQuery({ queryKey: ['budgets', statusFilter, page], enabled: canRead, queryFn: async () => unwrap(await api.get(`${base}/budgets?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`)) })
  const detailQuery = useQuery({ queryKey: ['budget-detail', selectedId], enabled: Boolean(selectedId), queryFn: async () => unwrap(await api.get(`${base}/budgets/${selectedId}`)) })
  const accountsQuery = useQuery({ queryKey: ['budget-accounts'], enabled: canRead, queryFn: async () => ({items:(await fetchAllPages('/financial/gl/accounts?is_active=1')).filter(account => Number(account.is_postable) === 1)}) })
  const createBudget = useMutation({ mutationFn: async data => unwrap(await api.post(`${base}/budgets`, data)), onSuccess: result => { toast.success('بودجه ساخته شد'); setEditor(null); refresh(); setSelectedId(result?.id || null) }, onError: error => toast.error(getErrorMessage(error)) })
  const updateBudget = useMutation({ mutationFn: async ({ id, data }) => unwrap(await api.patch(`${base}/budgets/${id}`, data)), onSuccess: () => { toast.success('بودجه ویرایش شد'); setEditor(null); refresh() }, onError: error => toast.error(getErrorMessage(error)) })
  const removeBudget = useMutation({ mutationFn: async id => unwrap(await api.delete(`${base}/budgets/${id}`)), onSuccess: () => { toast.success('بودجهٔ پیش‌نویس حذف شد'); setSelectedId(null); refresh() }, onError: error => toast.error(getErrorMessage(error)) })
  const createLine = useMutation({ mutationFn: async data => unwrap(await api.post(`${base}/budget-lines`, data)), onSuccess: () => { toast.success('ردیف بودجه ثبت شد'); setLineEditor(null); refresh() }, onError: error => toast.error(getErrorMessage(error)) })
  const updateLine = useMutation({ mutationFn: async ({ id, data }) => unwrap(await api.patch(`${base}/budget-lines/${id}`, data)), onSuccess: () => { toast.success('ردیف بودجه ویرایش شد'); setLineEditor(null); refresh() }, onError: error => toast.error(getErrorMessage(error)) })
  const deleteLine = useMutation({ mutationFn: async id => unwrap(await api.delete(`${base}/budget-lines/${id}`)), onSuccess: () => { toast.success('ردیف بودجه حذف شد'); refresh() }, onError: error => toast.error(getErrorMessage(error)) })
  const transition = useMutation({ mutationFn: async ({ id, action }) => unwrap(await api.post(`${base}/budgets/${id}/actions/${action}`)), onSuccess: result => { toast.success(result?.status === 'CLOSED' ? 'بودجه بسته شد' : 'بودجه تأیید شد'); refresh() }, onError: error => toast.error(getErrorMessage(error)) })
  const varianceQuery = useQuery({ queryKey: ['budget-variance', report?.id], enabled: Boolean(report?.id), queryFn: async () => unwrap(await api.get(`${base}/budgets/${report.id}/variance`)) })
  const budgets = listQuery.data?.items || []
  const selected = detailQuery.data
  const lines = selected?.lines || []
  const toBudgetExportRow = budget => [budget.code, budget.name, formatPersianDate(budget.period_start), formatPersianDate(budget.period_end), statusLabels[budget.status] || budget.status]
  const loadBudgetExportRows = async () => (await fetchAllPages(`${base}/budgets${statusFilter ? `?status=${statusFilter}` : ''}`)).map(toBudgetExportRow)
  const lineExportRows = lines.map(line => [monthLabel(line.period), line.account?.code, line.account?.name, money(line.amount), line.notes || '—'])
  const varianceItems = varianceQuery.data?.items || []
  const varianceExportRows = varianceItems.map(item => [monthLabel(item.period), `${item.account?.code || ''} · ${item.account?.name || ''}`, money(item.budgeted), money(item.actual), money(item.variance)])
  const accounts = accountsQuery.data || []
  const totalBudget = useMemo(() => lines.reduce((sum, line) => sum + BigInt(line.amount || 0), 0n), [lines])
  const mutateBusy = createBudget.isPending || updateBudget.isPending

  const submitBudget = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = { name: String(form.get('name')).trim(), period_start: form.get('period_start'), period_end: form.get('period_end'), notes: String(form.get('notes') || '').trim() || null }
    if (data.period_end < data.period_start) { toast.error('پایان دوره باید بعد از شروع دوره باشد'); return }
    if (editor.id) updateBudget.mutate({ id: editor.id, data })
    else createBudget.mutate(data)
  }
  const submitLine = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = { budget_id: selected.id, account_id: form.get('account_id'), period: form.get('period'), amount: String(form.get('amount')).replaceAll(',', '').trim(), notes: String(form.get('notes') || '').trim() || null }
    if (lineEditor.id) updateLine.mutate({ id: lineEditor.id, data: { amount: data.amount, notes: data.notes } })
    else createLine.mutate(data)
  }
  const openReport = budget => setReport({ id: budget.id, name: budget.name })

  if (!canRead) return <section className="resource-page"><div className="error-state"><FiAlertCircle />برای مشاهده بودجه‌ها دسترسی لازم را ندارید.</div></section>

  return <section className="resource-page budgets-page">
    <header className="budget-heading"><div><span className="eyebrow">مدیریت مالی</span><h1>بودجه‌ها</h1><p>برنامهٔ مالی را به تفکیک سرفصل و ماه ثبت کنید و با عملکرد واقعی دفترکل مقایسه کنید.</p></div><div className="budget-heading-actions"><DataExportActions title="فهرست بودجه‌ها" headers={['کد','نام بودجه','شروع','پایان','وضعیت']} loadRows={loadBudgetExportRows} subtitle={statusFilter ? `وضعیت: ${statusLabels[statusFilter]}` : ''}/><button className="btn btn-secondary" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}><FiRefreshCw /> به‌روزرسانی</button>{canCreate && <button className="btn btn-primary" onClick={() => setEditor({})}><FiPlus /> بودجهٔ جدید</button>}</div></header>
    <div className="budget-layout">
      <section className="budget-card budget-list-card"><div className="budget-card-heading"><div><h2>فهرست بودجه‌ها</h2><span>{new Intl.NumberFormat('fa-IR').format(listQuery.data?.pagination?.totalItems || 0)} بودجه</span></div><SearchableSelect value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }} aria-label="فیلتر وضعیت"><option value="">همه وضعیت‌ها</option><option value="DRAFT">پیش‌نویس</option><option value="APPROVED">تأییدشده</option><option value="CLOSED">بسته‌شده</option></SearchableSelect></div>
        {listQuery.isLoading ? <div className="loading-line" /> : listQuery.isError ? <div className="error-state"><FiAlertCircle />{getErrorMessage(listQuery.error)}</div> : !budgets.length ? <div className="empty-state"><strong>بودجه‌ای ثبت نشده است</strong><span>برای شروع، یک بودجهٔ جدید بسازید.</span></div> : <div className="budget-list">{budgets.map(budget => <button key={budget.id} className={`budget-list-item ${selectedId === budget.id ? 'selected' : ''}`} onClick={() => setSelectedId(budget.id)}><span className="budget-item-main"><b>{budget.name}</b><small>{budget.code} · {String(budget.period_start).slice(0, 7)} تا {String(budget.period_end).slice(0, 7)}</small></span><span className={`status-pill ${budget.status === 'APPROVED' ? 'status-green' : 'status-neutral'}`}>{statusLabels[budget.status] || budget.status}</span></button>)}</div>}
        <div className="table-footer"><span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(Math.max(1, listQuery.data?.pagination?.totalPages || 1))}</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>صفحهٔ قبل</button><button disabled={page >= (listQuery.data?.pagination?.totalPages || 1)} onClick={() => setPage(value => value + 1)}>صفحهٔ بعد</button></div></div>
      </section>
      <section className="budget-card budget-detail-card">{!selectedId ? <div className="budget-empty-detail"><FiBarChart2 /><b>یک بودجه انتخاب کنید</b><span>جزئیات و ردیف‌های آن در این قسمت نمایش داده می‌شود.</span></div> : detailQuery.isLoading ? <div className="loading-line" /> : detailQuery.isError ? <div className="error-state"><FiAlertCircle />{getErrorMessage(detailQuery.error)}</div> : selected && <>
        <div className="budget-detail-heading"><div><span className="eyebrow">{selected.code}</span><h2>{selected.name}</h2><p>{formatPersianDate(selected.period_start)} تا {formatPersianDate(selected.period_end)} · {statusLabels[selected.status]}</p></div><div className="budget-row-actions">
          {selected.status === 'DRAFT' && canUpdate && <button className="icon-button" title="ویرایش مشخصات" onClick={() => setEditor(selected)}><FiEdit2 /></button>}
          {selected.status === 'DRAFT' && canDelete && <button className="icon-button danger" title="حذف پیش‌نویس" onClick={() => window.confirm(`بودجهٔ «${selected.name}» و ردیف‌های آن حذف شود؟`) && removeBudget.mutate(selected.id)}><FiTrash2 /></button>}
          {['APPROVED', 'CLOSED'].includes(selected.status) && <button className="icon-button" title="گزارش انحراف" onClick={() => openReport(selected)}><FiEye /></button>}
          {selected.status === 'DRAFT' && canApprove && <button className="btn btn-primary" onClick={() => window.confirm('این بودجه تأیید شود؟ پس از تأیید، ردیف‌ها قابل ویرایش نیستند.') && transition.mutate({ id: selected.id, action: 'approve' })}><FiCheck /> تأیید بودجه</button>}
          {selected.status === 'APPROVED' && canClose && <button className="btn btn-secondary" onClick={() => window.confirm('بودجه بسته شود؟') && transition.mutate({ id: selected.id, action: 'close' })}>بستن بودجه</button>}
        </div></div>
        <div className="budget-summary"><div><span>تعداد ردیف‌ها</span><b>{new Intl.NumberFormat('fa-IR').format(lines.length)}</b></div><div><span>جمع بودجه</span><b>{money(totalBudget.toString())}</b></div><div><span>بازه</span><b>{monthLabel(selected.period_start)} تا {monthLabel(selected.period_end)}</b></div></div>
        <div className="budget-lines-heading"><div><h3>ردیف‌های بودجه</h3><p>برای هر سرفصل، مبلغ ماهانه را جداگانه ثبت کنید.</p></div><div className="budget-row-actions"><DataExportActions title={`ردیف‌های ${selected.name}`} headers={['ماه','کد سرفصل','نام سرفصل','مبلغ بودجه','توضیحات']} rows={lineExportRows}/>{selected.status === 'DRAFT' && canUpdate && <button className="btn btn-primary" onClick={() => setLineEditor({})}><FiPlus /> افزودن ردیف</button>}</div></div>
        {!lines.length ? <div className="empty-state"><strong>ردیفی برای این بودجه ثبت نشده</strong><span>ردیف‌ها را با انتخاب سرفصل و ماه اضافه کنید.</span></div> : <div className="table-scroll"><table className="data-table budget-lines-table"><thead><tr><th>ماه</th><th>کد</th><th>سرفصل حساب</th><th>مبلغ بودجه</th><th>توضیحات</th>{selected.status === 'DRAFT' && canUpdate && <th>عملیات</th>}</tr></thead><tbody>{lines.map(line => <tr key={line.id}><td>{monthLabel(line.period)}</td><td>{line.account?.code}</td><td>{line.account?.name}</td><td className="number-cell">{money(line.amount)}</td><td>{line.notes || '—'}</td>{selected.status === 'DRAFT' && canUpdate && <td><div className="heading-actions"><button className="icon-button" title="ویرایش ردیف" onClick={() => setLineEditor(line)}><FiEdit2 /></button>{canDelete && <button className="icon-button danger" title="حذف ردیف" onClick={() => window.confirm('این ردیف بودجه حذف شود؟') && deleteLine.mutate(line.id)}><FiTrash2 /></button>}</div></td>}</tr>)}</tbody></table></div>}
      </>}</section>
    </div>
    {editor && <Modal title={editor.id ? 'ویرایش بودجه' : 'ساخت بودجه'} onClose={() => setEditor(null)}><form className="modal-form budget-form" onSubmit={submitBudget}><label>نام بودجه *<input name="name" required defaultValue={editor.name || ''} maxLength="150" /></label><label>از تاریخ *<JalaliDateInput name="period_start" required defaultValue={String(editor.period_start || '').slice(0, 10)} /></label><label>تا تاریخ *<JalaliDateInput name="period_end" required defaultValue={String(editor.period_end || '').slice(0, 10)} /></label><label className="full">توضیحات<textarea name="notes" rows="3" defaultValue={editor.notes || ''} /></label><footer><button className="btn btn-secondary" type="button" onClick={() => setEditor(null)}>انصراف</button><button className="btn btn-primary" disabled={mutateBusy}>{editor.id ? 'ذخیره تغییرات' : 'ساخت بودجه'}</button></footer></form></Modal>}
    {lineEditor && selected && <Modal title={lineEditor.id ? 'ویرایش ردیف بودجه' : 'افزودن ردیف بودجه'} onClose={() => setLineEditor(null)}><form className="modal-form budget-form" onSubmit={submitLine}><label className="full">سرفصل حساب *<SearchableSelect name="account_id" required defaultValue={lineEditor.account_id || ''} disabled={Boolean(lineEditor.id)}><option value="" disabled>انتخاب سرفصل قابل ثبت</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</SearchableSelect></label><label>ماه *<JalaliDateInput name="period" monthOnly required defaultValue={lineEditor.period || String(selected.period_start).slice(0, 7)} disabled={Boolean(lineEditor.id)}/></label><label>مبلغ (ریال) *<input name="amount" inputMode="numeric" pattern="[0-9,]+" required defaultValue={lineEditor.amount || ''} /></label><label className="full">توضیحات<textarea name="notes" rows="2" defaultValue={lineEditor.notes || ''} /></label><footer><button className="btn btn-secondary" type="button" onClick={() => setLineEditor(null)}>انصراف</button><button className="btn btn-primary" disabled={createLine.isPending || updateLine.isPending}>{lineEditor.id ? 'ذخیره ردیف' : 'ثبت ردیف'}</button></footer></form></Modal>}
    {report && <Modal title={`گزارش انحراف · ${report.name}`} onClose={() => setReport(null)} wide><div className="budget-report-content"><DataExportActions title={`گزارش انحراف ${report.name}`} headers={['ماه','سرفصل','بودجه','عملکرد','انحراف (بودجه − عملکرد)']} rows={varianceExportRows}/>{varianceQuery.isLoading ? <div className="loading-line" /> : varianceQuery.isError ? <div className="error-state"><FiAlertCircle />{getErrorMessage(varianceQuery.error)}</div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>ماه</th><th>سرفصل</th><th>بودجه</th><th>عملکرد</th><th>انحراف (بودجه − عملکرد)</th></tr></thead><tbody>{varianceItems.map((item, index) => <tr key={`${item.account?.id}-${item.period}-${index}`}><td>{monthLabel(item.period)}</td><td>{item.account?.code} · {item.account?.name}</td><td className="number-cell">{money(item.budgeted)}</td><td className="number-cell">{money(item.actual)}</td><td className={`number-cell ${BigInt(item.variance) < 0n ? 'budget-over' : 'budget-under'}`}>{money(item.variance)}</td></tr>)}</tbody></table></div>}</div></Modal>}
  </section>
}
