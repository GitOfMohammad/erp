import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FiAlertCircle, FiChevronLeft, FiEye, FiFileText, FiPlus, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import SearchableSelect from '../components/SearchableSelect'
import DataExportActions from '../components/DataExportActions'
import JalaliDateInput from '../components/JalaliDateInput'
import { api, getErrorMessage, unwrap } from '../services/api'
import { formatPersianDate } from '../utils/persianDate'
import { fetchAllPages } from '../utils/fetchAllPages'

const asArray = data => Array.isArray(data) ? data : data?.items || []
const fa = value => new Intl.NumberFormat('fa-IR').format(Number(value || 0))
const typeLabels = { DELIVERY: 'وضعیت تحویل', INVOICE: 'فاکتور', PAYMENT: 'پرداخت', QUALITY: 'کیفیت کالا', SHIPPING: 'ارسال', PRICE: 'قیمت', OTHER: 'سایر' }
const statusLabels = { OPEN: 'باز', IN_PROGRESS: 'در حال پیگیری', RESOLVED: 'رسیدگی‌شده', CLOSED: 'بسته', PENDING: 'در انتظار', COMPLETED: 'تکمیل‌شده' }
const toLocalDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`

function useAccess() {
  const user = useSelector(state => state.session.user)
  const permissions = user?.permissions || []
  const admin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  return {
    read: admin || permissions.includes('scm.vendors.read'),
    create: admin || permissions.includes('scm.vendors.create'),
    partnersRead: admin || permissions.includes('commercial.partners.read'),
    invoicesRead: admin || permissions.includes('purchasing.invoices.read'),
  }
}

export default function VendorUpdatesPage() {
  const access = useAccess()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [receivedDate, setReceivedDate] = useState(toLocalDate(new Date()))
  const [receivedTime, setReceivedTime] = useState(new Intl.DateTimeFormat('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date()))

  const list = useQuery({
    queryKey: ['scm-vendor-updates', page, search],
    enabled: access.read,
    queryFn: async () => unwrap(await api.get(`/scm/vendor-updates?page=${page}&limit=20${search ? `&q=${encodeURIComponent(search)}` : ''}`)),
  })
  const suppliers = useQuery({
    queryKey: ['scm-vendor-suppliers', supplierSearch],
    enabled: access.partnersRead && dialogOpen,
    queryFn: async () => ({ items: await fetchAllPages(`/commercial/partners?type=SUPPLIER&search=${encodeURIComponent(supplierSearch)}`) }),
  })
  const invoices = useQuery({
    queryKey: ['scm-vendor-invoices', partnerId],
    enabled: access.invoicesRead && dialogOpen && Boolean(partnerId),
    queryFn: async () => ({ items: await fetchAllPages('/commercial/purchasing/invoices?status=APPROVED') }),
  })
  const supplierItems = asArray(suppliers.data)
  const invoiceItems = useMemo(() => asArray(invoices.data).filter(item => item.partner_id === partnerId), [invoices.data, partnerId])
  const loadExportRows = async () => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    const rows = await fetchAllPages(`/scm/vendor-updates${params.size ? `?${params}` : ''}`)
    return rows.map(row => [
      formatPersianDate(row.received_at, true), row.partner?.name || '—',
      typeLabels[row.update_type] || row.update_type, row.reference || '—',
      row.document?.document_no || '—', statusLabels[row.status] || row.status || '—',
      row.message || '',
    ])
  }
  const mutation = useMutation({
    mutationFn: async payload => unwrap(await api.post('/scm/vendor-updates', payload)),
    onSuccess: () => {
      toast.success('به‌روزرسانی تأمین‌کننده ثبت شد')
      qc.invalidateQueries({ queryKey: ['scm-vendor-updates'] })
      closeDialog()
    },
    onError: error => toast.error(getErrorMessage(error)),
  })
  function closeDialog() {
    setDialogOpen(false); setPartnerId(''); setDocumentId(''); setSupplierSearch('')
    setReceivedDate(toLocalDate(new Date()))
    setReceivedTime(new Intl.DateTimeFormat('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date()))
  }
  function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const localDateTime = new Date(`${receivedDate}T${receivedTime}:00`)
    if (!partnerId || Number.isNaN(localDateTime.getTime())) return toast.error('تأمین‌کننده و تاریخ دریافت را بررسی کنید')
    mutation.mutate({
      partner_id: partnerId,
      document_id: documentId || null,
      update_type: String(data.get('update_type') || ''),
      reference: String(data.get('reference') || '').trim() || null,
      status: String(data.get('status') || '').trim() || null,
      message: String(data.get('message') || '').trim(),
      received_at: localDateTime.toISOString(),
    })
  }

  if (!access.read) return <section className="resource-page"><div className="panel error-state"><FiAlertCircle/><strong>دسترسی به تبادل تأمین‌کننده ندارید</strong><span>برای فعال‌سازی دسترسی با مدیر سامانه تماس بگیرید.</span></div></section>

  const rows = asArray(list.data)
  const total = list.data?.pagination?.totalItems ?? rows.length
  return <section className="resource-page crm-page">
    <header className="page-heading crm-page-heading"><div><div className="eyebrow">پنل مدیریت <FiChevronLeft/> لجستیک و تأمین</div><h1>پیگیری تأمین‌کنندگان</h1><p>پیام‌ها، وضعیت سفارش و به‌روزرسانی‌های دریافتی از تأمین‌کنندگان را ثبت و پیگیری کنید.</p></div><div className="heading-actions"><DataExportActions title="سوابق پیگیری تأمین‌کنندگان" headers={['تاریخ دریافت','تأمین‌کننده','نوع به‌روزرسانی','شماره مرجع','سند خرید','وضعیت','شرح']} loadRows={loadExportRows} subtitle="همهٔ نتایج مطابق جستجوی جاری"/><button className="btn btn-secondary" disabled={list.isFetching} onClick={() => list.refetch()}><FiRefreshCw/> به‌روزرسانی</button>{access.create && <button className="btn btn-primary" disabled={!access.partnersRead} onClick={() => setDialogOpen(true)} title={!access.partnersRead ? 'برای انتخاب تأمین‌کننده به مجوز مشاهده طرف‌های تجاری نیاز است' : undefined}><FiPlus/> ثبت به‌روزرسانی</button>}</div></header>
    <div className="resource-stats"><div><span className="resource-stat-icon"><FiFileText/></span><div><strong>{fa(total)}</strong><small>به‌روزرسانی ثبت‌شده</small></div></div><span className="live-indicator"><i/> همگام با سامانه</span></div>
    <section className="panel resource-panel crm-list-panel"><div className="table-toolbar"><div className="crm-list-title"><FiFileText/><b>سوابق ارتباط با تأمین‌کنندگان</b><span>{fa(total)} مورد</span></div><div className="table-tools"><label className="table-search"><FiSearch/><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="جستجو در پیام یا شماره مرجع…"/></label></div></div>
      {list.error ? <div className="error-state"><FiAlertCircle/><strong>دریافت سوابق انجام نشد</strong><span>{getErrorMessage(list.error)}</span><button className="btn btn-secondary" onClick={() => list.refetch()}>تلاش دوباره</button></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>تاریخ دریافت</th><th>تأمین‌کننده</th><th>نوع به‌روزرسانی</th><th>شماره مرجع</th><th>سند خرید</th><th>وضعیت</th><th>شرح</th><th>جزئیات</th></tr></thead><tbody>
        {list.isLoading ? Array.from({length:5},(_,index)=><tr key={index}><td colSpan="8"><div className="skeleton-row"/></td></tr>) : rows.map(row => <tr key={row.id}><td>{formatPersianDate(row.received_at, true)}</td><td><strong>{row.partner?.name || '—'}</strong>{row.partner?.code && <small className="crm-subline">{row.partner.code}</small>}</td><td>{typeLabels[row.update_type] || row.update_type}</td><td>{row.reference || '—'}</td><td>{row.document?.document_no || '—'}</td><td><span className={`status-pill crm-status crm-${String(row.status || '').toLowerCase()}`}>{statusLabels[row.status] || row.status || '—'}</span></td><td className="crm-cell-wrap">{row.message.length > 90 ? `${row.message.slice(0,90)}…` : row.message}</td><td><button className="icon-button" title="مشاهده شرح کامل" aria-label="مشاهده شرح کامل" onClick={() => setSelected(row)}><FiEye/></button></td></tr>)}
        {!list.isLoading && !rows.length && <tr><td colSpan="8"><div className="empty-state"><strong>{search ? 'نتیجه‌ای پیدا نشد' : 'هنوز به‌روزرسانی ثبت نشده است'}</strong><span>{search ? 'عبارت جست‌وجو را تغییر دهید.' : 'پیام‌ها و تغییر وضعیت‌های اعلام‌شده از سوی تأمین‌کنندگان را اینجا ثبت کنید.'}</span>{access.create && <button className="btn btn-primary" onClick={() => setDialogOpen(true)} disabled={!access.partnersRead}><FiPlus/> ثبت اولین مورد</button>}</div></td></tr>}
      </tbody></table></div>}
      <div className="table-footer"><span>صفحهٔ {fa(page)} از {fa(Math.max(1,list.data?.pagination?.totalPages || 1))}</span><div className="pagination"><button disabled={page<=1} onClick={() => setPage(value => value-1)}>صفحهٔ قبل</button><button disabled={page >= (list.data?.pagination?.totalPages || 1)} onClick={() => setPage(value => value+1)}>صفحهٔ بعد</button></div></div>
    </section>
    {dialogOpen && <div className="lead-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && closeDialog()}><section className="lead-dialog crm-dialog wide" role="dialog" aria-modal="true"><header><div><h2>ثبت به‌روزرسانی تأمین‌کننده</h2><small className="crm-subline">اطلاعات ثبت‌شده پس از ثبت قابل ویرایش نیست.</small></div><button type="button" className="icon-button" aria-label="بستن" onClick={closeDialog}><FiX/></button></header>
      {!access.partnersRead ? <div className="error-state"><FiAlertCircle/><strong>مجوز مشاهدهٔ تأمین‌کنندگان لازم است</strong><span>برای ثبت پیام، مدیر سامانه باید مجوز «مشاهده طرف‌های تجاری» را هم برای شما فعال کند.</span></div> : <form className="crm-form" onSubmit={submit}>
        <label className="form-field"><span>تأمین‌کننده *</span><SearchableSelect className="form-control" options={supplierItems.map(item => ({id:item.id,label:`${item.name}${item.code ? ` · ${item.code}` : ''}`}))} value={partnerId} onSearch={setSupplierSearch} onChange={value => { setPartnerId(value); setDocumentId('') }} loading={suppliers.isLoading} placeholder="جست‌وجو و انتخاب تأمین‌کننده" emptyLabel={suppliers.error ? 'دریافت تأمین‌کنندگان ممکن نیست' : 'تأمین‌کننده‌ای پیدا نشد'}/></label>
        <label className="form-field"><span>نوع به‌روزرسانی *</span><SearchableSelect className="form-control" name="update_type" required placeholder="انتخاب نوع"><option value="DELIVERY">وضعیت تحویل</option><option value="INVOICE">فاکتور</option><option value="PAYMENT">پرداخت</option><option value="QUALITY">کیفیت کالا</option><option value="SHIPPING">ارسال</option><option value="PRICE">قیمت</option><option value="OTHER">سایر</option></SearchableSelect></label>
        <label className="form-field"><span>شماره مرجع</span><input name="reference" maxLength="100" placeholder="شماره سفارش، پیگیری یا مکاتبه"/></label>
        <label className="form-field"><span>وضعیت اعلام‌شده</span><input name="status" maxLength="30" placeholder="مثلاً در حال ارسال"/></label>
        {access.invoicesRead && <label className="form-field"><span>فاکتور خرید مرتبط</span><SearchableSelect className="form-control" options={invoiceItems.map(item => ({id:item.id,label:`${item.document_no} · ${item.partner_name || item.partner?.name || ''}`}))} value={documentId} onChange={setDocumentId} loading={invoices.isLoading} disabled={!partnerId} placeholder={partnerId ? 'انتخاب فاکتور (اختیاری)' : 'ابتدا تأمین‌کننده را انتخاب کنید'} emptyLabel="فاکتور تأییدشده‌ای برای این تأمین‌کننده نیست"/></label>}
        <div className="form-field"><span>تاریخ دریافت *</span><JalaliDateInput className="form-control" value={receivedDate} onChange={setReceivedDate} required/></div>
        <label className="form-field"><span>ساعت دریافت</span><input type="time" value={receivedTime} onChange={event => setReceivedTime(event.target.value)} required/></label>
        <label className="form-field crm-full"><span>شرح پیام یا به‌روزرسانی *</span><textarea name="message" rows="5" maxLength="10000" required placeholder="جزئیات پیام، تغییر وضعیت یا توافق اعلام‌شده را بنویسید…"/></label>
        <footer><button type="button" className="btn btn-secondary" onClick={closeDialog}>انصراف</button><button className="btn btn-primary" disabled={mutation.isPending || suppliers.isLoading || !supplierItems.length}>{mutation.isPending ? <span className="spinner"/> : <><FiPlus/> ثبت به‌روزرسانی</>}</button></footer>
      </form>}</section></div>}
    {selected && <div className="lead-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && setSelected(null)}><section className="lead-dialog" role="dialog" aria-modal="true"><header><h2>جزئیات به‌روزرسانی</h2><button type="button" className="icon-button" aria-label="بستن" onClick={() => setSelected(null)}><FiX/></button></header><div className="lead-detail-grid"><div><small>تأمین‌کننده</small><b>{selected.partner?.name || '—'}</b></div><div><small>نوع</small><b>{typeLabels[selected.update_type] || selected.update_type}</b></div><div><small>تاریخ دریافت</small><b>{formatPersianDate(selected.received_at, true)}</b></div><div><small>مرجع</small><b>{selected.reference || '—'}</b></div><div><small>سند خرید</small><b>{selected.document?.document_no || '—'}</b></div><div><small>وضعیت</small><b>{statusLabels[selected.status] || selected.status || '—'}</b></div></div><div className="lead-detail-block"><small>شرح کامل</small><p>{selected.message}</p></div></section></div>}
  </section>
}
