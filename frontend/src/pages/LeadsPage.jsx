import { formatPersianDate } from '../utils/persianDate'
import SearchableSelect from '../components/SearchableSelect'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FiAlertCircle, FiRepeat, FiCheck, FiChevronLeft, FiChevronRight, FiEdit2, FiEye, FiPlus, FiRefreshCw, FiSearch, FiTarget, FiUserPlus, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'

const fa = value => new Intl.NumberFormat('fa-IR').format(Number(value || 0))
const money = value => value === null || value === undefined || value === '' ? '—' : `${new Intl.NumberFormat('fa-IR').format(BigInt(value))} ریال`
const statuses = { NEW: 'جدید', CONTACTED: 'تماس‌گرفته‌شده', QUALIFIED: 'واجد شرایط', CONVERTED: 'تبدیل‌شده به مشتری', LOST: 'ازدست‌رفته' }
const sources = { WEB: 'وب‌سایت', REFERRAL: 'معرفی', COLD_CALL: 'تماس سرد', ADVERTISING: 'تبلیغات', EVENT: 'رویداد', PARTNER: 'معرفی شریک', OTHER: 'سایر' }
const statusStyle = status => ({ NEW: 'neutral', CONTACTED: 'blue', QUALIFIED: 'green', CONVERTED: 'green', LOST: 'red' })[status] || 'neutral'
const nextSteps = { NEW: [['CONTACTED', 'ثبت تماس'], ['QUALIFIED', 'واجد شرایط'], ['LOST', 'از دست رفت']], CONTACTED: [['QUALIFIED', 'واجد شرایط'], ['LOST', 'از دست رفت']], QUALIFIED: [['LOST', 'از دست رفت']] }

function LeadModal({ title, initial, busy, onClose, onSubmit }) {
  const submit = event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({ firstName: String(data.get('firstName')).trim(), lastName: String(data.get('lastName')).trim(), companyName: String(data.get('companyName') || '').trim() || null, phone: String(data.get('phone') || '').trim() || null, email: String(data.get('email') || '').trim() || null, address: String(data.get('address') || '').trim() || null, source: data.get('source'), estimatedValue: data.get('estimatedValue') ? Number(String(data.get('estimatedValue')).replaceAll(',', '')) : null, notes: String(data.get('notes') || '').trim() || null })
  }
  return <LeadDialog title={title} onClose={onClose}><form className="modal-form lead-form" onSubmit={submit}>
    <label><span>نام *</span><input name="firstName" required maxLength="100" defaultValue={initial?.first_name || ''} /></label>
    <label><span>نام خانوادگی *</span><input name="lastName" required maxLength="100" defaultValue={initial?.last_name || ''} /></label>
    <label><span>شرکت / سازمان</span><input name="companyName" maxLength="200" defaultValue={initial?.company_name || ''} /></label>
    <label><span>شماره تماس</span><input name="phone" inputMode="tel" maxLength="30" defaultValue={initial?.phone || ''} /></label>
    <label><span>ایمیل</span><input name="email" type="email" maxLength="254" defaultValue={initial?.email || ''} /></label>
    <label><span>منبع آشنایی</span><SearchableSelect name="source" defaultValue={initial?.source || 'OTHER'}>{Object.entries(sources).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SearchableSelect></label>
    <label><span>ارزش احتمالی (ریال)</span><input name="estimatedValue" inputMode="numeric" pattern="[0-9,]*" defaultValue={initial?.estimated_value || ''} /></label>
    <label className="full"><span>نشانی</span><textarea name="address" rows="2" maxLength="1000" defaultValue={initial?.address || ''} /></label>
    <label className="full"><span>یادداشت</span><textarea name="notes" rows="3" defaultValue={initial?.notes || ''} /></label>
    <footer><button type="button" className="btn btn-secondary" onClick={onClose}>انصراف</button><button className="btn btn-primary" disabled={busy}>{initial ? 'ذخیره تغییرات' : 'ثبت سرنخ'}</button></footer>
  </form></LeadDialog>
}

function LeadDialog({ title, onClose, children, wide = false }) {
  return <div className="lead-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className={`lead-dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="بستن"><FiX /></button></header>{children}</section></div>
}

export default function LeadsPage() {
  const user = useSelector(state => state.session.user)
  const permissions = user?.permissions || []
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const allowed = permission => isAdmin || permissions.includes(permission)
  const canRead = allowed('crm.leads.read')
  const canCreate = allowed('crm.leads.create')
  const canUpdate = allowed('crm.leads.update')
  const canConvert = allowed('crm.leads.convert')
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [lostReason, setLostReason] = useState(null)
  const [convertOpen, setConvertOpen] = useState(false)
  const [conversionMode, setConversionMode] = useState('new')
  const [partnerSearch, setPartnerSearch] = useState('')
  const endpoint = '/crm/leads'
  const leadsQuery = useQuery({ queryKey: ['crm-leads', page, search, status], enabled: canRead, queryFn: async () => unwrap(await api.get(`${endpoint}?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}`)) })
  const detailQuery = useQuery({ queryKey: ['crm-lead', detailId], enabled: Boolean(detailId), queryFn: async () => unwrap(await api.get(`${endpoint}/${detailId}`)) })
  const partnersQuery = useQuery({ queryKey: ['crm-convert-partners', partnerSearch], enabled: convertOpen && conversionMode === 'existing' && partnerSearch.trim().length >= 2, queryFn: async () => ({ items: await fetchAllPages(`/commercial/partners?type=CUSTOMER&is_active=1&search=${encodeURIComponent(partnerSearch.trim())}`) }) })
  const leads = leadsQuery.data?.items || []
  const exportHeaders = ['نام سرنخ', 'شماره سرنخ', 'شرکت', 'تلفن', 'ایمیل', 'منبع', 'مرحله', 'ارزش احتمالی', 'مسئول']
  const exportLeads = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const items = await fetchAllPages(`${endpoint}${params.size ? `?${params}` : ''}`)
    return items.map(lead => [`${lead.first_name || ''} ${lead.last_name || ''}`.trim(), lead.lead_number, lead.company_name || '—', lead.phone || '—', lead.email || '—', sources[lead.source] || 'سایر', statuses[lead.status] || lead.status, money(lead.estimated_value), lead.assignee?.username || '—'])
  }
  const total = Number(leadsQuery.data?.pagination?.totalItems || 0)
  const selectedLead = detailQuery.data
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['crm-leads'] }); if (detailId) queryClient.invalidateQueries({ queryKey: ['crm-lead', detailId] }) }
  const createLead = useMutation({ mutationFn: async payload => unwrap(await api.post(endpoint, payload)), onSuccess: lead => { toast.success('سرنخ ثبت شد'); setShowCreate(false); invalidate(); setDetailId(lead?.id || null) }, onError: error => toast.error(getErrorMessage(error)) })
  const updateLead = useMutation({ mutationFn: async ({ id, payload }) => unwrap(await api.patch(`${endpoint}/${id}`, payload)), onSuccess: () => { toast.success('سرنخ ویرایش شد'); setEditing(null); invalidate() }, onError: error => toast.error(getErrorMessage(error)) })
  const changeStatus = useMutation({ mutationFn: async ({ id, status: nextStatus, reason }) => unwrap(await api.post(`${endpoint}/${id}/status`, { status: nextStatus, ...(reason ? { reason } : {}) })), onSuccess: () => { toast.success('مرحلهٔ سرنخ به‌روزرسانی شد'); setLostReason(null); invalidate() }, onError: error => toast.error(getErrorMessage(error)) })
  const convertLead = useMutation({ mutationFn: async ({ id, payload }) => unwrap(await api.post(`${endpoint}/${id}/convert`, payload)), onSuccess: result => { toast.success(`سرنخ به مشتری «${result?.partner?.name || ''}» تبدیل شد`); setConvertOpen(false); setConversionMode('new'); invalidate() }, onError: error => toast.error(getErrorMessage(error)) })
  const counts = useMemo(() => leads.reduce((acc, lead) => { acc[lead.status] = (acc[lead.status] || 0) + 1; return acc }, {}), [leads])
  const rangeStart = total ? (page - 1) * 20 + 1 : 0
  const rangeEnd = Math.min(page * 20, total)
  const chooseStatus = (nextStatus, lead) => {
    if (nextStatus === 'LOST') setLostReason(lead)
    else changeStatus.mutate({ id: lead.id, status: nextStatus })
  }
  const submitLost = event => { event.preventDefault(); const reason = new FormData(event.currentTarget).get('reason'); if (!String(reason || '').trim()) return; changeStatus.mutate({ id: lostReason.id, status: 'LOST', reason: String(reason).trim() }) }
  const submitConversion = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = conversionMode === 'existing' ? { partnerId: String(form.get('partnerId') || '') } : { partnerName: String(form.get('partnerName') || '').trim(), phone: String(form.get('phone') || '').trim() || null, email: String(form.get('email') || '').trim() || null, address: String(form.get('address') || '').trim() || null }
    if (conversionMode === 'existing' && !payload.partnerId) { toast.error('یک مشتری انتخاب کنید'); return }
    if (conversionMode === 'new' && !payload.partnerName) { toast.error('نام مشتری را وارد کنید'); return }
    convertLead.mutate({ id: selectedLead.id, payload })
  }
  const searchSubmit = event => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }

  if (!canRead) return <section className="resource-page"><div className="error-state"><FiAlertCircle /><strong>دسترسی مشاهدهٔ سرنخ‌های فروش برای حساب شما فعال نیست.</strong></div></section>

  return <section className="resource-page leads-page">
    <header className="page-heading"><div><div className="eyebrow">پنل مدیریت <FiChevronLeft /> ارتباط با مشتریان</div><h1>سرنخ‌های فروش</h1><p>سرنخ‌های جدید را ثبت کنید، مرحلهٔ پیگیری را جلو ببرید و فرصت‌های واجدشرایط را به مشتری تبدیل کنید.</p></div><div className="heading-actions"><DataExportActions title="سرنخ‌های فروش" headers={exportHeaders} loadRows={exportLeads} subtitle={`فیلتر جاری؛ ${fa(total)} سرنخ`}/><button className="btn btn-secondary" disabled={leadsQuery.isFetching} onClick={() => leadsQuery.refetch()}><FiRefreshCw /> به‌روزرسانی</button>{canCreate && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus /> ثبت سرنخ</button>}</div></header>
    <div className="resource-stats leads-stats"><div><span className="resource-stat-icon"><FiTarget /></span><div><strong>{fa(total)}</strong><small>سرنخ در نتیجهٔ فعلی</small></div></div><div><span className="lead-stat-dot new"/><div><strong>{fa(counts.NEW || 0)}</strong><small>جدید در این صفحه</small></div></div><div><span className="lead-stat-dot qualified"/><div><strong>{fa(counts.QUALIFIED || 0)}</strong><small>واجد شرایط در این صفحه</small></div></div><span className="live-indicator"><i /> همگام با سامانه</span></div>
    <div className="panel resource-panel leads-panel"><div className="table-toolbar"><div className="resource-tabs"><button className={!status ? 'tab active' : 'tab'} onClick={() => { setPage(1); setStatus('') }}>همه سرنخ‌ها <span>{fa(total)}</span></button><button className={status === 'NEW' ? 'tab active' : 'tab'} onClick={() => { setPage(1); setStatus('NEW') }}>جدید</button><button className={status === 'CONTACTED' ? 'tab active' : 'tab'} onClick={() => { setPage(1); setStatus('CONTACTED') }}>در حال پیگیری</button><button className={status === 'QUALIFIED' ? 'tab active' : 'tab'} onClick={() => { setPage(1); setStatus('QUALIFIED') }}>واجد شرایط</button></div><div className="table-tools"><form className="table-search" onSubmit={searchSubmit}><FiSearch /><input placeholder="جستجو در نام، شرکت، تلفن یا ایمیل..." value={searchInput} onChange={event => setSearchInput(event.target.value)} /><button type="submit" aria-label="جستجو"><FiSearch /></button></form><SearchableSelect className="form-control" aria-label="فیلتر مرحلهٔ سرنخ" value={status} onChange={event => { setPage(1); setStatus(event.target.value) }}><option value="">همه مراحل</option><option value="NEW">جدید</option><option value="CONTACTED">تماس‌گرفته‌شده</option><option value="QUALIFIED">واجد شرایط</option><option value="CONVERTED">تبدیل‌شده به مشتری</option><option value="LOST">ازدست‌رفته</option></SearchableSelect></div></div>
      {leadsQuery.isError ? <div className="error-state"><FiAlertCircle /><strong>دریافت سرنخ‌ها انجام نشد</strong><span>{getErrorMessage(leadsQuery.error)}</span><button className="btn btn-secondary" onClick={() => leadsQuery.refetch()}>تلاش دوباره</button></div> : <div className="table-scroll"><table className="data-table leads-table"><thead><tr><th>سرنخ</th><th>راه ارتباطی</th><th>منبع</th><th>مرحله</th><th>ارزش احتمالی</th><th>مسئول</th><th>عملیات</th></tr></thead><tbody>
        {leadsQuery.isLoading ? Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan="7"><div className="skeleton-row" /></td></tr>) : leads.length ? leads.map(lead => <tr key={lead.id}><td><div className="lead-primary"><b>{lead.first_name} {lead.last_name}</b><small>{lead.lead_number}{lead.company_name ? ` · ${lead.company_name}` : ''}</small></div></td><td><div className="lead-contact">{lead.phone && <span dir="ltr">{lead.phone}</span>}{lead.email && <small dir="ltr">{lead.email}</small>}{!lead.phone && !lead.email && '—'}</div></td><td>{sources[lead.source] || 'سایر'}</td><td><span className={`status-pill lead-status ${statusStyle(lead.status)}`}>{statuses[lead.status] || lead.status}</span></td><td className="number-cell">{money(lead.estimated_value)}</td><td>{lead.assignee?.username || '—'}</td><td><div className="heading-actions"><button className="icon-button" title="مشاهدهٔ جزئیات" aria-label={`جزئیات ${lead.lead_number}`} onClick={() => setDetailId(lead.id)}><FiEye /></button>{canUpdate && !['LOST', 'CONVERTED'].includes(lead.status) && <button className="icon-button" title="ویرایش سرنخ" aria-label={`ویرایش ${lead.lead_number}`} onClick={() => setEditing(lead)}><FiEdit2 /></button>}</div></td></tr>) : <tr><td colSpan="7"><div className="empty-state"><span className="empty-state-icon"><FiTarget /></span><strong>سرنخی برای نمایش نیست</strong><span>{search || status ? 'عبارت جستجو یا فیلتر مرحله را تغییر دهید.' : 'با ثبت اولین سرنخ، پیگیری فرصت‌های فروش را شروع کنید.'}</span>{canCreate && !search && !status && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus /> ثبت اولین سرنخ</button>}</div></td></tr>}
      </tbody></table></div>}
      <div className="table-footer"><span>نمایش <b>{fa(rangeStart)} تا {fa(rangeEnd)}</b> از <b>{fa(total)}</b> سرنخ</span><div className="pagination"><button aria-label="صفحهٔ قبل" disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronRight /></button><span>صفحهٔ {fa(page)}</span><button aria-label="صفحهٔ بعد" disabled={leads.length < 20 || page * 20 >= total} onClick={() => setPage(page + 1)}><FiChevronLeft /></button></div></div>
    </div>
    {showCreate && <LeadModal title="ثبت سرنخ فروش" busy={createLead.isPending} onClose={() => setShowCreate(false)} onSubmit={payload => createLead.mutate(payload)} />}
    {editing && <LeadModal key={editing.id} title="ویرایش سرنخ" initial={editing} busy={updateLead.isPending} onClose={() => setEditing(null)} onSubmit={payload => updateLead.mutate({ id: editing.id, payload })} />}
    {detailId && <LeadDetailsDialog lead={selectedLead} loading={detailQuery.isLoading} error={detailQuery.error} onClose={() => { setDetailId(null); setConvertOpen(false); setConversionMode('new') }} onEdit={lead => { setEditing(lead); setDetailId(null) }} canUpdate={canUpdate} canConvert={canConvert} onStatus={chooseStatus} onConvert={() => { setConversionMode('new'); setPartnerSearch(''); setConvertOpen(true) }} busy={changeStatus.isPending} />}
    {lostReason && <LeadDialog title={`ثبت دلیل از دست رفتن · ${lostReason.first_name} ${lostReason.last_name}`} onClose={() => setLostReason(null)}><form className="modal-form lead-reason-form" onSubmit={submitLost}><label htmlFor="lead-lost-reason">دلیل از دست رفتن سرنخ *</label><textarea id="lead-lost-reason" name="reason" rows="4" maxLength="1000" required autoFocus /><footer><button className="btn btn-secondary" type="button" onClick={() => setLostReason(null)}>انصراف</button><button className="btn btn-primary" disabled={changeStatus.isPending}>ثبت دلیل و بستن سرنخ</button></footer></form></LeadDialog>}
    {convertOpen && selectedLead && <LeadDialog title="تبدیل سرنخ به مشتری" onClose={() => setConvertOpen(false)}><form className="modal-form lead-convert-form" onSubmit={submitConversion}><p className="lead-convert-note">این سرنخ به طرف‌حساب مشتری تبدیل می‌شود و دیگر قابل ویرایش نخواهد بود.</p><div className="lead-convert-mode"><button type="button" className={conversionMode === 'new' ? 'active' : ''} onClick={() => setConversionMode('new')}><FiUserPlus /> ساخت مشتری جدید</button><button type="button" className={conversionMode === 'existing' ? 'active' : ''} onClick={() => setConversionMode('existing')}><FiRepeat /> اتصال به مشتری موجود</button></div>{conversionMode === 'new' ? <><label>نام مشتری / شرکت *</label><input name="partnerName" required defaultValue={selectedLead.company_name || `${selectedLead.first_name} ${selectedLead.last_name}`} /><label>شماره تماس</label><input name="phone" defaultValue={selectedLead.phone || ''} /><label>ایمیل</label><input name="email" type="email" defaultValue={selectedLead.email || ''} /><label>نشانی</label><textarea name="address" rows="2" defaultValue={selectedLead.address || ''} /></> : <><label>انتخاب مشتری فعال *</label><SearchableSelect name="partnerId" defaultValue=""><option value="" disabled>انتخاب مشتری</option>{(partnersQuery.data?.items || []).map(partner => <option key={partner.id} value={partner.id}>{partner.name} · {partner.code}</option>)}</SearchableSelect>{partnersQuery.isLoading && <small>در حال دریافت مشتری‌ها…</small>}{partnersQuery.isError && <small className="lead-error-note">دریافت مشتری‌ها ممکن نشد؛ دسترسی مشاهدهٔ طرف‌های تجاری را بررسی کنید.</small>}<input aria-label="جستجوی مشتری" placeholder="جستجو در مشتریان…" value={partnerSearch} onChange={event => setPartnerSearch(event.target.value)} />{!partnersQuery.isLoading && !partnersQuery.isError && partnerSearch.trim().length < 2 && <small>برای جست‌وجو دست‌کم دو نویسه وارد کنید.</small>}{!partnersQuery.isLoading && !partnersQuery.isError && partnerSearch.trim().length >= 2 && !(partnersQuery.data?.items || []).length && <small>مشتری فعالی با این عبارت پیدا نشد.</small>}</>}<footer><button type="button" className="btn btn-secondary" onClick={() => setConvertOpen(false)}>انصراف</button><button className="btn btn-primary" disabled={convertLead.isPending || (conversionMode === 'existing' && (partnersQuery.isLoading || !partnersQuery.data?.items?.length))}><FiCheck /> تبدیل به مشتری</button></footer></form></LeadDialog>}
  </section>
}

function LeadDetailsDialog({ lead, loading, error, onClose, onEdit, canUpdate, canConvert, onStatus, onConvert, busy }) {
  if (loading) return <LeadDialog title="جزئیات سرنخ" onClose={onClose}><div className="loading-line" /></LeadDialog>
  if (error || !lead) return <LeadDialog title="جزئیات سرنخ" onClose={onClose}><div className="error-state"><FiAlertCircle />{getErrorMessage(error || new Error('سرنخ پیدا نشد'))}</div></LeadDialog>
  const steps = nextSteps[lead.status] || []
  return <LeadDialog title="جزئیات سرنخ" onClose={onClose} wide><div className="lead-detail"><div className="lead-detail-top"><div><span className="eyebrow">{lead.lead_number}</span><h3>{lead.first_name} {lead.last_name}</h3><p>{lead.company_name || 'شخص حقیقی'} · ثبت‌شده در {lead.created_at ? formatPersianDate(lead.created_at) : '—'}</p></div><span className={`status-pill lead-status ${statusStyle(lead.status)}`}>{statuses[lead.status] || lead.status}</span></div><div className="lead-detail-grid"><div><small>شماره تماس</small><b dir="ltr">{lead.phone || '—'}</b></div><div><small>ایمیل</small><b dir="ltr">{lead.email || '—'}</b></div><div><small>منبع آشنایی</small><b>{sources[lead.source] || 'سایر'}</b></div><div><small>ارزش احتمالی</small><b>{money(lead.estimated_value)}</b></div><div><small>مسئول پیگیری</small><b>{lead.assignee?.username || '—'}</b></div>{lead.convertedPartner && <div><small>طرف‌حساب ایجادشده</small><b>{lead.convertedPartner.name} · {lead.convertedPartner.code}</b></div>}</div>{lead.address && <div className="lead-detail-block"><small>نشانی</small><p>{lead.address}</p></div>}{lead.notes && <div className="lead-detail-block"><small>یادداشت</small><p>{lead.notes}</p></div>}{lead.lost_reason && <div className="lead-detail-block lost"><small>دلیل از دست رفتن</small><p>{lead.lost_reason}</p></div>}<div className="lead-detail-actions">{canUpdate && !['LOST', 'CONVERTED'].includes(lead.status) && <button className="btn btn-secondary" onClick={() => onEdit(lead)}><FiEdit2 /> ویرایش سرنخ</button>}{canUpdate && steps.map(([status, label]) => <button key={status} className={status === 'LOST' ? 'btn btn-secondary lead-lost-button' : 'btn btn-secondary'} disabled={busy} onClick={() => onStatus(status, lead)}>{label}</button>)}{canConvert && lead.status === 'QUALIFIED' && <button className="btn btn-primary" onClick={onConvert}><FiRepeat /> تبدیل به مشتری</button>}</div></div></LeadDialog>
}
