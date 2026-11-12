import { formatPersianDate } from '../utils/persianDate'
import SearchableSelect from '../components/SearchableSelect'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FiAlertCircle, FiCheck, FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import JalaliDateInput from '../components/JalaliDateInput'
import FormattedNumberInput from '../components/FormattedNumberInput'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'
import './ProjectsPage.css'

const labels = {
  PLANNED: 'برنامه‌ریزی‌شده', ACTIVE: 'در حال اجرا', ON_HOLD: 'متوقف', COMPLETED: 'تکمیل‌شده', CANCELLED: 'لغوشده',
  TODO: 'انجام‌نشده', IN_PROGRESS: 'در حال انجام', BLOCKED: 'مسدود', DONE: 'تکمیل‌شده', DRAFT: 'پیش‌نویس', APPROVED: 'تأییدشده', REJECTED: 'ردشده',
}
const iso = value => value ? String(value).slice(0, 10) : ''
const money = value => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const dateLabel = value => value ? formatPersianDate(`${iso(value)}T12:00:00`) : '—'
const itemsOf = result => result?.items || result?.rows || []

function ProjectModal({ kind, initial, projects, users, accounts, onClose, onSave, busy }) {
  const [data, setData] = useState(() => ({
    name: initial.name || '', description: initial.description || '',
    start_date: iso(initial.start_date), end_date: iso(initial.end_date), budget_amount: String(initial.budget_amount || ''),
    project_id: initial.project_id || '', assignee_id: initial.assignee_id || '', title: initial.title || '',
    start_date: iso(initial.start_date), due_date: iso(initial.due_date), progress: String(initial.progress ?? 0), expense_date: iso(initial.expense_date) || new Date().toISOString().slice(0, 10),
    amount: String(initial.amount || ''), account_id: initial.account_id || '',
  }))
  const set = (key, value) => setData(current => ({ ...current, [key]: value }))
  const task = kind === 'task', expense = kind === 'expense'
  const title = expense ? 'ثبت هزینهٔ پروژه' : task ? (initial.id ? 'ویرایش وظیفه' : 'وظیفهٔ جدید') : (initial.id ? 'ویرایش پروژه' : 'پروژهٔ جدید')
  const submit = event => { event.preventDefault(); onSave(data) }
  return <div className="project-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="project-modal" role="dialog" aria-modal="true" aria-label={title}><header><div><span className="eyebrow">مدیریت پروژه</span><h2>{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="بستن"><FiX/></button></header><form className="project-form" onSubmit={submit}>
    {task || expense ? <label><span>پروژه *</span><SearchableSelect required value={data.project_id} onChange={event => set('project_id', event.target.value)}><option value="">انتخاب پروژه</option>{projects.filter(item => !['COMPLETED','CANCELLED'].includes(item.status)).map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</SearchableSelect></label> : <><label><span>نام پروژه *</span><input required maxLength="180" value={data.name} onChange={event => set('name', event.target.value)} /></label><label><span>تاریخ شروع</span><JalaliDateInput value={data.start_date} onChange={value => set('start_date', value)} /></label><label><span>تاریخ پایان</span><JalaliDateInput value={data.end_date} onChange={value => set('end_date', value)} /></label><label><span>بودجه (ریال)</span><FormattedNumberInput value={data.budget_amount} decimalScale={0} onValueChange={value => set('budget_amount', value)} /></label><label className="project-form-wide"><span>توضیحات</span><textarea rows="3" value={data.description} onChange={event => set('description', event.target.value)} /></label></>}
    {task && <><label><span>عنوان وظیفه *</span><input required maxLength="180" value={data.title} onChange={event => set('title', event.target.value)} /></label><label><span>مسئول</span><SearchableSelect value={data.assignee_id} onChange={event => set('assignee_id', event.target.value)}><option value="">بدون مسئول</option>{users.map(user => <option key={user.id} value={user.id}>{user.username || user.name || user.full_name || user.id}</option>)}</SearchableSelect></label><label><span>تاریخ شروع</span><JalaliDateInput value={data.start_date} onChange={value => set('start_date', value)} /></label><label><span>سررسید</span><JalaliDateInput value={data.due_date} onChange={value => set('due_date', value)} /></label><label><span>پیشرفت (درصد)</span><FormattedNumberInput value={data.progress} decimalScale={0} onValueChange={value => set('progress', value)} /></label><label className="project-form-wide"><span>توضیحات</span><textarea rows="3" value={data.description} onChange={event => set('description', event.target.value)} /></label></>}
    {expense && <><label><span>تاریخ هزینه *</span><JalaliDateInput value={data.expense_date} onChange={value => set('expense_date', value)} required /></label><label><span>مبلغ (ریال) *</span><FormattedNumberInput required value={data.amount} decimalScale={0} onValueChange={value => set('amount', value)} /></label><label className="project-form-wide"><span>سرفصل هزینه *</span><SearchableSelect required value={data.account_id} onChange={event => set('account_id', event.target.value)}><option value="">انتخاب حساب هزینه</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</SearchableSelect></label><label className="project-form-wide"><span>شرح هزینه *</span><textarea required maxLength="300" rows="3" value={data.description} onChange={event => set('description', event.target.value)} /></label></>}
    <footer><button className="btn btn-secondary" type="button" onClick={onClose}>انصراف</button><button className="btn btn-primary" disabled={busy}>{busy ? 'در حال ثبت…' : initial.id ? 'ذخیره تغییرات' : 'ثبت'}</button></footer>
  </form></section></div>
}

export default function ProjectsPage({ resource }) {
  const user = useSelector(state => state.session.user), permissions = user?.permissions || []
  const admin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const allowed = code => admin || permissions.includes(code)
  const kind = resource.slug === 'project-tasks' ? 'task' : resource.slug === 'project-expenses' ? 'expense' : 'project'
  const config = kind === 'task' ? { endpoint:'/projects/tasks', permission:'project.tasks', title:'وظایف پروژه', singular:'وظیفه' } : kind === 'expense' ? { endpoint:'/projects/expenses', permission:'project.expenses', title:'هزینه‌های پروژه', singular:'هزینه' } : { endpoint:'/projects/projects', permission:'project.projects', title:'پروژه‌ها', singular:'پروژه' }
  const canRead = allowed(`${config.permission}.read`), canCreate = allowed(`${config.permission}.create`), canUpdate = allowed(`${config.permission}.update`), canDelete = allowed(`${config.permission}.delete`)
  const qc = useQueryClient(), [editor, setEditor] = useState(null), [search, setSearch] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1)
  const listUrl = `${config.endpoint}?page=${page}&limit=20${search ? `&q=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}`
  const exportUrl = `${config.endpoint}${search || status ? '?' : ''}${search ? `q=${encodeURIComponent(search)}` : ''}${search && status ? '&' : ''}${status ? `status=${status}` : ''}`
  const list = useQuery({ queryKey:['project-resource', kind, search, status, page], enabled:canRead, queryFn:async () => unwrap(await api.get(listUrl)) })
  const projectsQuery = useQuery({ queryKey:['project-options'], enabled:canRead && kind !== 'project', queryFn:async () => ({items:await fetchAllPages('/projects/projects')}) })
  const usersQuery = useQuery({ queryKey:['project-users'], enabled:canRead && kind === 'task', queryFn:async () => ({items:await fetchAllPages('/users')}) })
  const accountsQuery = useQuery({ queryKey:['project-expense-accounts'], enabled:canRead && kind === 'expense', queryFn:async () => ({items:await fetchAllPages('/financial/gl/accounts?is_active=1')}) })
  const projects = kind === 'project' ? itemsOf(list.data) : itemsOf(projectsQuery.data)
  const projectMap = useMemo(() => new Map(projects.map(item => [String(item.id), item])), [projects])
  const users = itemsOf(usersQuery.data), accounts = itemsOf(accountsQuery.data).filter(item => item.account_type === 'EXPENSE' && Number(item.is_postable) === 1)
  const refresh = () => { qc.invalidateQueries({ queryKey:['project-resource'] }); qc.invalidateQueries({ queryKey:['project-options'] }) }
  const save = useMutation({ mutationFn:async ({ payload, id }) => id ? unwrap(await api.patch(`${config.endpoint}/${id}`, payload)) : unwrap(await api.post(config.endpoint, payload)), onSuccess:() => { toast.success(`${config.singular} ذخیره شد`); setEditor(null); refresh() }, onError:error => toast.error(getErrorMessage(error)) })
  const remove = useMutation({ mutationFn:async id => unwrap(await api.delete(`${config.endpoint}/${id}`)), onSuccess:() => { toast.success(`${config.singular} غیرفعال شد`); refresh() }, onError:error => toast.error(getErrorMessage(error)) })
  const transition = useMutation({ mutationFn:async ({ id, action }) => unwrap(await api.post(`${config.endpoint}/${id}/actions/${action}`)), onSuccess:() => { toast.success('وضعیت به‌روزرسانی شد'); refresh() }, onError:error => toast.error(getErrorMessage(error)) })
  const onSave = data => {
    let payload
    if (kind === 'project') payload = { name:data.name.trim(), description:data.description.trim() || null, start_date:data.start_date || null, end_date:data.end_date || null, budget_amount:data.budget_amount || '0' }
    if (kind === 'task') payload = { ...(editor.id ? {} : { project_id:data.project_id }), title:data.title.trim(), description:data.description.trim() || null, assignee_id:data.assignee_id || null, start_date:data.start_date || null, due_date:data.due_date || null, progress:Number(data.progress || 0) }
    if (kind === 'expense') payload = { project_id:data.project_id, expense_date:data.expense_date, description:data.description.trim(), amount:data.amount, account_id:data.account_id }
    save.mutate({ id:editor.id, payload })
  }
  if (!canRead) return <section className="resource-page"><div className="error-state"><FiAlertCircle/>برای مشاهدهٔ این بخش دسترسی لازم را ندارید.</div></section>
  const rows = itemsOf(list.data)
  const exportHeaders = kind === 'project' ? ['کد', 'نام پروژه', 'شروع', 'پایان', 'بودجه (ریال)', 'وضعیت'] : kind === 'task' ? ['کد', 'عنوان وظیفه', 'پروژه', 'مسئول', 'سررسید', 'پیشرفت', 'وضعیت'] : ['پروژه', 'تاریخ', 'شرح', 'مبلغ (ریال)', 'وضعیت']
  const exportProjectRows = values => values.map(row => { const project = kind === 'project' ? row : projectMap.get(String(row.project_id)); const person = users.find(item => String(item.id) === String(row.assignee_id)); return kind === 'project' ? [row.code, row.name, dateLabel(row.start_date), dateLabel(row.end_date), money(row.budget_amount), labels[row.status] || row.status] : kind === 'task' ? [row.code, row.title, project?.name || '—', row.assignee?.username || person?.username || '—', dateLabel(row.due_date), `${new Intl.NumberFormat('fa-IR').format(row.progress || 0)}٪`, labels[row.status] || row.status] : [project?.name || '—', dateLabel(row.expense_date), row.description, money(row.amount), labels[row.status] || row.status] })
  const loadExportRows = async () => exportProjectRows(await fetchAllPages(exportUrl))
  const possibleActions = row => {
    if (kind === 'project') return [row.status === 'PLANNED' && ['start','project.projects.start','شروع'], row.status === 'ACTIVE' && ['hold','project.projects.hold','توقف'], row.status === 'ON_HOLD' && ['resume','project.projects.resume','ادامه'], row.status === 'ACTIVE' && ['complete','project.projects.complete','تکمیل']].filter(Boolean)
    if (kind === 'task') return [row.status === 'TODO' && ['start','project.tasks.start','شروع'], row.status === 'IN_PROGRESS' && ['block','project.tasks.block','مسدودکردن'], ['IN_PROGRESS','BLOCKED'].includes(row.status) && ['complete','project.tasks.complete','تکمیل']].filter(Boolean)
    return [row.status === 'DRAFT' && ['approve','project.expenses.approve','تأیید'], row.status === 'DRAFT' && ['reject','project.expenses.reject','رد']].filter(Boolean)
  }
  return <section className="resource-page projects-page"><header className="projects-heading"><div><span className="eyebrow">مدیریت و پیگیری</span><h1>{config.title}</h1><p>اطلاعات پروژه، وظایف و هزینه‌ها را در یک نمای عملیاتی مدیریت کنید.</p></div><div className="projects-heading-actions"><DataExportActions title={config.title} headers={exportHeaders} loadRows={loadExportRows} subtitle={status ? `وضعیت: ${labels[status]}` : ''}/><button className="btn btn-secondary" onClick={() => list.refetch()} disabled={list.isFetching}><FiRefreshCw/> به‌روزرسانی</button>{canCreate && <button className="btn btn-primary" onClick={() => setEditor({})}><FiPlus/> {kind === 'project' ? 'پروژهٔ جدید' : kind === 'task' ? 'وظیفهٔ جدید' : 'ثبت هزینه'}</button>}</div></header>
    <div className="projects-summary"><div><b>{new Intl.NumberFormat('fa-IR').format(list.data?.pagination?.totalItems ?? rows.length)}</b><span>رکورد {config.title}</span></div><span className="live-indicator"><i/> همگام با سامانه</span></div>
    <section className="projects-table-card"><div className="projects-tools"><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder={`جستجو در ${config.title}…`}/><SearchableSelect value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">همه وضعیت‌ها</option>{(kind === 'project' ? ['PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED'] : kind === 'task' ? ['TODO','IN_PROGRESS','BLOCKED','DONE'] : ['DRAFT','APPROVED','REJECTED']).map(value => <option key={value} value={value}>{labels[value]}</option>)}</SearchableSelect></div>
      {list.isLoading ? <div className="hr-loading">در حال دریافت اطلاعات…</div> : list.isError ? <div className="error-state"><FiAlertCircle/>{getErrorMessage(list.error)}</div> : !rows.length ? <div className="empty-state"><strong>موردی ثبت نشده است</strong><span>با دکمهٔ «{kind === 'project' ? 'پروژهٔ جدید' : kind === 'task' ? 'وظیفهٔ جدید' : 'ثبت هزینه'}» شروع کنید.</span></div> : <div className="table-scroll"><table className="data-table projects-table"><thead><tr>{kind === 'project' ? <><th>کد</th><th>نام پروژه</th><th>بازهٔ زمانی</th><th>بودجه</th></> : kind === 'task' ? <><th>کد</th><th>عنوان وظیفه</th><th>پروژه</th><th>مسئول</th><th>سررسید</th><th>پیشرفت</th></> : <><th>پروژه</th><th>تاریخ</th><th>شرح</th><th>مبلغ</th></> }<th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{rows.map(row => { const project = kind === 'project' ? row : projectMap.get(String(row.project_id)); const actions = possibleActions(row); return <tr key={row.id}>
        {kind === 'project' ? <><td>{row.code}</td><td><b>{row.name}</b></td><td>{dateLabel(row.start_date)} تا {dateLabel(row.end_date)}</td><td className="number-cell">{money(row.budget_amount)}</td></> : kind === 'task' ? <><td>{row.code}</td><td><b>{row.title}</b></td><td>{project?.name || '—'}</td><td>{row.assignee?.username || users.find(item => String(item.id) === String(row.assignee_id))?.username || '—'}</td><td>{dateLabel(row.due_date)}</td><td>{new Intl.NumberFormat('fa-IR').format(row.progress || 0)}٪</td></> : <><td>{project?.name || '—'}</td><td>{dateLabel(row.expense_date)}</td><td>{row.description}</td><td className="number-cell">{money(row.amount)}</td></>}
        <td><span className={`project-status status-${row.status?.toLowerCase()}`}>{labels[row.status] || row.status}</span></td><td><div className="project-row-actions">{canUpdate && (kind !== 'expense' || row.status === 'DRAFT') && (kind !== 'task' || row.status !== 'DONE') && <button className="icon-button" title="ویرایش" onClick={() => setEditor(row)}><FiEdit2/></button>}{canDelete && kind !== 'expense' && !['COMPLETED','CANCELLED','DONE'].includes(row.status) && <button className="icon-button danger" title="غیرفعال‌سازی" onClick={() => window.confirm(`«${row.name || row.title || row.description}» غیرفعال شود؟`) && remove.mutate(row.id)}><FiTrash2/></button>}{actions.map(([action, permission, label]) => allowed(permission) && <button key={action} className="project-action-button" onClick={() => window.confirm(`وضعیت «${row.name || row.title || row.description}» به ${label} تغییر کند؟`) && transition.mutate({ id:row.id, action })}><FiCheck/>{label}</button>)}</div></td>
      </tr>})}</tbody></table></div>}
      <div className="table-footer"><span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(Math.max(1, list.data?.pagination?.totalPages || 1))}</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>صفحهٔ قبل</button><button disabled={page >= (list.data?.pagination?.totalPages || 1)} onClick={() => setPage(value => value + 1)}>صفحهٔ بعد</button></div></div>
    </section>
    {editor && <ProjectModal kind={kind} initial={editor} projects={kind === 'project' ? [] : projects} users={users} accounts={accounts} onClose={() => setEditor(null)} onSave={onSave} busy={save.isPending}/>}
  </section>
}
