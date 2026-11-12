import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertCircle, FiChevronLeft, FiEye, FiPlus, FiRefreshCw, FiTruck, FiCheck, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import SearchableSelect from '../components/SearchableSelect'
import FormattedNumberInput from '../components/FormattedNumberInput'
import JalaliDateInput from '../components/JalaliDateInput'
import { formatPersianDate } from '../utils/persianDate'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'
import './ShipmentsPage.css'

const rowsOf = (value) => Array.isArray(value) ? value : value?.items || []
const formatQuantity = (value) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 }).format(Number(value || 0))
const statuses = { PLANNED: 'آمادهٔ ارسال', PICKED_UP: 'تحویل حمل‌کننده', IN_TRANSIT: 'در مسیر', DELIVERED: 'تحویل‌شده', EXCEPTION: 'دارای مشکل', CANCELLED: 'لغوشده' }
const typeName = (doc) => doc.document_type === 'PURCHASE_INVOICE' ? 'فاکتور خرید' : doc.document_type === 'SALES_INVOICE' ? 'فاکتور فروش' : doc.document_type === 'PURCHASE_RETURN' ? 'برگشت از خرید' : 'برگشت از فروش'
const remainingByDocument = (shipments, documentId) => {
  const used = new Map()
  for (const shipment of shipments) {
    if (shipment.document_id !== documentId || shipment.status === 'CANCELLED') continue
    for (const item of shipment.items || []) used.set(item.product_id, (used.get(item.product_id) || 0) + Number(item.quantity || 0))
  }
  return used
}

export default function ShipmentsPage() {
  const user = useSelector((state) => state.session.user)
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const permissions = user?.permissions || []
  const canRead = isAdmin || permissions.includes('scm.shipments.read')
  const canCreate = isAdmin || permissions.includes('scm.shipments.create')
  const canPickup = isAdmin || permissions.includes('scm.shipments.pickup')
  const canTransit = isAdmin || permissions.includes('scm.shipments.transit')
  const canDeliver = isAdmin || permissions.includes('scm.shipments.deliver')
  const [creating, setCreating] = useState(false)
  const [details, setDetails] = useState(null)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['scm-shipments', page], queryFn: async () => unwrap(await api.get(`/scm/shipments?page=${page}&limit=20`)), enabled: canRead })
  const allShipmentsQuery = useQuery({ queryKey: ['scm-shipments-all'], queryFn: async () => ({items:await fetchAllPages('/scm/shipments')}), enabled: canRead && creating })
  const purchaseQuery = useQuery({ queryKey: ['shipment-approved-purchases'], queryFn: async () => ({items:await fetchAllPages('/commercial/purchasing/invoices?status=APPROVED')}), enabled: canCreate })
  const salesQuery = useQuery({ queryKey: ['shipment-approved-sales'], queryFn: async () => ({items:await fetchAllPages('/commercial/sales/invoices?status=APPROVED')}), enabled: canCreate })
  const shipments = rowsOf(query.data)
  const loadExportRows = async () => (await fetchAllPages('/scm/shipments')).map(shipment => [shipment.shipment_number, shipment.document?.document_no || 'انتقال داخلی', shipment.direction === 'INBOUND' ? 'دریافت' : 'ارسال', shipment.partner?.name || '—', (shipment.items || []).map(item => `${item.product?.name || item.product_id}: ${formatQuantity(item.quantity)}`).join('؛ '), statuses[shipment.status] || shipment.status, shipment.planned_at ? formatPersianDate(shipment.planned_at) : '—', shipment.carrier || '—', shipment.tracking_number || '—'])
  const documents = useMemo(() => [...rowsOf(purchaseQuery.data), ...rowsOf(salesQuery.data)], [purchaseQuery.data, salesQuery.data])
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['scm-shipments'] }); queryClient.invalidateQueries({ queryKey: ['scm-shipments-all'] }) }
  const create = useMutation({ mutationFn: async (payload) => unwrap(await api.post('/scm/shipments', payload)), onSuccess: () => { toast.success('مرسوله و اقلام آن ثبت شد'); setCreating(false); refresh() }, onError: (error) => toast.error(getErrorMessage(error)) })
  const transition = useMutation({ mutationFn: async ({ id, action }) => unwrap(await api.post(`/scm/shipments/${id}/actions/${action}`)), onSuccess: () => { toast.success('وضعیت مرسوله به‌روزرسانی شد'); refresh() }, onError: (error) => toast.error(getErrorMessage(error)) })

  if (!canRead) return <section className="resource-page"><div className="panel error-state"><FiAlertCircle/><strong>دسترسی به مرسوله‌ها برای حساب شما فعال نیست</strong></div></section>

  const startTransition = (shipment, action) => {
    const messages = { pickup: 'مرسوله به حمل‌کننده تحویل شود؟', transit: 'حرکت مرسوله ثبت شود؟', deliver: 'تحویل مرسوله ثبت شود؟ فاکتور قبلاً موجودی را تغییر داده است و این مرحله موجودی را دوباره تغییر نمی‌دهد.' }
    if (window.confirm(messages[action])) transition.mutate({ id: shipment.id, action })
  }

  return <section className="resource-page">
    <div className="page-heading"><div><div className="eyebrow">پنل مدیریت <FiChevronLeft/> لجستیک</div><h1>مرسوله‌ها</h1><p>ثبت ارسال یا دریافت کامل و جزئی از روی فاکتور تأییدشده و پیگیری وضعیت حمل.</p></div><div className="heading-actions"><DataExportActions title="فهرست مرسوله‌ها" headers={["شماره مرسوله","سند","جهت","طرف‌حساب","اقلام","وضعیت","تاریخ برنامه‌ریزی","حمل‌کننده","شماره پیگیری"]} loadRows={loadExportRows}/><button className="btn btn-secondary" disabled={query.isFetching} onClick={refresh}><FiRefreshCw/> بروزرسانی</button>{canCreate&&<button className="btn btn-primary" onClick={()=>setCreating(true)}><FiPlus/> ثبت مرسولهٔ فاکتور</button>}</div></div>
    <div className="resource-stats"><div><span className="resource-stat-icon"><FiTruck/></span><div><strong>{new Intl.NumberFormat('fa-IR').format(query.data?.pagination?.totalItems || 0)}</strong><small>مرسولهٔ ثبت‌شده</small></div></div><span className="live-indicator"><i/> همگام با سامانه</span></div>
    <div className="panel resource-panel"><div className="shipments-note">برای فاکتورهای تأییدشده می‌توانید در چند مرسوله ارسال یا دریافت ثبت کنید. مجموع اقلام مرسوله از مقدار فاکتور بیشتر نمی‌شود و تحویل مرسولهٔ فاکتوری موجودی را دوباره تغییر نمی‌دهد.</div>
      {query.isError?<div className="error-state"><FiAlertCircle/><strong>دریافت مرسوله‌ها انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button className="btn btn-secondary" onClick={()=>query.refetch()}>تلاش دوباره</button></div>:<><div className="table-scroll"><table className="data-table"><thead><tr><th>شماره مرسوله</th><th>سند مرتبط</th><th>جهت</th><th>طرف‌حساب</th><th>اقلام / مقدار</th><th>وضعیت</th><th>تاریخ برنامه‌ریزی</th><th>عملیات</th></tr></thead><tbody>
        {query.isLoading?Array.from({length:4},(_,i)=><tr key={i}><td colSpan="8"><div className="skeleton-row"/></td></tr>):shipments.length?shipments.map(shipment=><tr key={shipment.id}><td><strong>{shipment.shipment_number}</strong><small className="shipment-subline">{shipment.tracking_number||shipment.carrier||'—'}</small></td><td>{shipment.document?.document_no||'انتقال داخلی'}</td><td>{shipment.direction==='INBOUND'?'دریافت':'ارسال'}</td><td>{shipment.partner?.name||'—'}</td><td>{(shipment.items||[]).map(item=><span className="shipment-item-chip" key={item.id}>{item.product?.name||item.product_id} · {formatQuantity(item.quantity)}</span>)}{!shipment.items?.length&&'—'}</td><td><span className={`status-pill ${shipment.status==='DELIVERED'?'status-green':'status-neutral'}`}>{statuses[shipment.status]||shipment.status}</span></td><td>{shipment.planned_at?formatPersianDate(shipment.planned_at):'—'}</td><td><div className="heading-actions"><button className="icon-button" title="جزئیات مرسوله" aria-label={`جزئیات ${shipment.shipment_number}`} onClick={()=>setDetails(shipment)}><FiEye/></button>{shipment.status==='PLANNED'&&canPickup&&<button className="icon-button" title="تحویل به حمل‌کننده" aria-label={`تحویل به حمل‌کننده ${shipment.shipment_number}`} onClick={()=>startTransition(shipment,'pickup')}><FiTruck/></button>}{shipment.status==='PICKED_UP'&&canTransit&&<button className="icon-button" title="ثبت حرکت»" aria-label={`ثبت حرکت ${shipment.shipment_number}`} onClick={()=>startTransition(shipment,'transit')}><FiChevronLeft/></button>}{shipment.status==='IN_TRANSIT'&&canDeliver&&<button className="icon-button" title="ثبت تحویل»" aria-label={`ثبت تحویل ${shipment.shipment_number}`} onClick={()=>startTransition(shipment,'deliver')}><FiCheck/></button>}</div></td></tr>):<tr><td colSpan="8"><div className="empty-state"><strong>مرسوله‌ای ثبت نشده است</strong><span>برای فاکتور تأییدشده، ارسال یا دریافت جزئی را ثبت کنید.</span>{canCreate&&<button className="btn btn-primary" onClick={()=>setCreating(true)}><FiPlus/> ثبت اولین مرسوله</button>}</div></td></tr>}
      </tbody></table></div><div className="table-footer"><span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(Math.max(1, query.data?.pagination?.totalPages || 1))}</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>صفحهٔ قبل</button><button disabled={page >= (query.data?.pagination?.totalPages || 1)} onClick={() => setPage(value => value + 1)}>صفحهٔ بعد</button></div></div></>}
    </div>
    {creating&&<ShipmentForm documents={documents} shipments={rowsOf(allShipmentsQuery.data)} busy={create.isPending} loading={purchaseQuery.isLoading||salesQuery.isLoading||allShipmentsQuery.isLoading} failed={purchaseQuery.isError||salesQuery.isError||allShipmentsQuery.isError} onClose={()=>setCreating(false)} onSubmit={(payload)=>create.mutate(payload)}/>}
    {details&&<ShipmentDetails shipment={details} onClose={()=>setDetails(null)}/>}
  </section>
}

function ShipmentForm({ documents, shipments, busy, loading, failed, onClose, onSubmit }) {
  const [documentId,setDocumentId]=useState('')
  const [number,setNumber]=useState('')
  const [plannedAt,setPlannedAt]=useState('')
  const [carrier,setCarrier]=useState('')
  const [tracking,setTracking]=useState('')
  const [notes,setNotes]=useState('')
  const [quantities,setQuantities]=useState({})
  const [error,setError]=useState('')
  const selected=documents.find(doc=>doc.id===documentId)
  const used=selected?remainingByDocument(shipments,selected.id):new Map()
  const available=(selected?.items||[]).map(line=>({...line,remaining:Math.max(0,Number(line.quantity)-Number(used.get(line.product_id)||0))})).filter(line=>line.remaining>0)
  const options=documents.filter(doc=>doc.items?.some(line=>Number(line.quantity)-Number(remainingByDocument(shipments,doc.id).get(line.product_id)||0)>0)).map(doc=>({id:doc.id,label:`${doc.document_no} · ${doc.partner_name} · ${typeName(doc)}`}))
  const submit=(event)=>{event.preventDefault();if(!number.trim())return setError('شمارهٔ مرسوله را وارد کنید.');if(!selected)return setError('فاکتور تأییدشده را انتخاب کنید.');const items=available.filter(line=>Number(quantities[line.product_id]||0)>0).map(line=>({product_id:line.product_id,quantity:String(quantities[line.product_id])}));if(!items.length)return setError('مقدار حداقل یک قلم را وارد کنید.');for(const item of items){const line=available.find(row=>row.product_id===item.product_id);if(!/^\d+(\.\d{1,3})?$/.test(item.quantity)||Number(item.quantity)>line.remaining)return setError('مقدار مرسوله باید مثبت و حداکثر برابر مقدار باقی‌ماندهٔ قلم باشد.')}const direction=['PURCHASE_INVOICE','SALES_RETURN'].includes(selected.document_type)?'INBOUND':'OUTBOUND';onSubmit({shipment_number:number.trim(),direction,partner_id:selected.partner_id,document_id:selected.id,source_warehouse_id:null,destination_warehouse_id:null,planned_at:plannedAt||null,carrier:carrier.trim()||null,tracking_number:tracking.trim()||null,notes:notes.trim()||null,items})}
  return <div className="modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section className="modal-card shipment-modal"><div className="modal-heading"><div><span className="eyebrow">لجستیک · فاکتور تأییدشده</span><h2>ثبت مرسولهٔ جزئی یا کامل</h2></div><button className="icon-button" type="button" aria-label="بستن" onClick={onClose}><FiX/></button></div><form className="modal-form" onSubmit={submit}>
    <label className="form-field"><span>شمارهٔ مرسوله *</span><input className="form-control" value={number} onChange={event=>setNumber(event.target.value)} maxLength={40} required/></label>
    <label className="form-field shipment-document-select"><span>فاکتور تأییدشده *</span><SearchableSelect options={options} value={documentId} onChange={id=>{setDocumentId(id);setQuantities({});setError('')}} loading={loading} placeholder="شماره فاکتور یا طرف‌حساب را جست‌وجو کنید" emptyLabel="فاکتور تأییدشدهٔ باقی‌مانده پیدا نشد"/></label>
    <label className="form-field"><span>تاریخ برنامه‌ریزی</span><JalaliDateInput className="form-control" value={plannedAt} onChange={setPlannedAt}/></label>
    <label className="form-field"><span>حمل‌کننده</span><input className="form-control" value={carrier} onChange={event=>setCarrier(event.target.value)} maxLength={150}/></label>
    <label className="form-field"><span>شمارهٔ پیگیری</span><input className="form-control" value={tracking} onChange={event=>setTracking(event.target.value)} maxLength={100}/></label>
    <label className="form-field"><span>یادداشت</span><input className="form-control" value={notes} onChange={event=>setNotes(event.target.value)}/></label>
    <div className="shipment-lines shipment-document-select"><div className="shipment-lines-title"><strong>مقدار قابل ارسال / دریافت</strong><small>فقط مقدار این مرسوله ثبت می‌شود؛ می‌توانید برای باقی‌مانده مرسولهٔ دیگری بسازید.</small></div>{selected?available.map(line=><label className="shipment-line" key={line.product_id}><span><strong>{line.product?.name||line.product_id}</strong><small>{line.product?.code||''} · ماندهٔ فاکتور: {formatQuantity(line.remaining)} {line.product?.unit||''}</small></span><FormattedNumberInput className="form-control" decimalScale={3} value={quantities[line.product_id]||''} onValueChange={value=>setQuantities(current=>({...current,[line.product_id]:value}))} aria-label={`مقدار مرسوله ${line.product?.name||line.product_id}`}/></label>):<div className="shipment-empty-lines">ابتدا فاکتور تأییدشده را انتخاب کنید.</div>}{selected&&!available.length&&<div className="shipment-empty-lines">برای این فاکتور مقداری باقی نمانده است.</div>}</div>
    {failed&&<small className="shipment-form-error shipment-document-select">دریافت فاکتورهای تأییدشده انجام نشد؛ دوباره تلاش کنید.</small>}{error&&<small className="shipment-form-error shipment-document-select">{error}</small>}
    <div className="shipment-form-note shipment-document-select">جهت مرسوله از نوع فاکتور تعیین می‌شود. تحویل این مرسوله، موجودی را تغییر نمی‌دهد؛ گردش موجودی هنگام تأیید فاکتور ثبت شده است.</div>
    <div className="modal-actions shipment-document-select"><button type="button" className="btn btn-secondary" onClick={onClose}>انصراف</button><button type="submit" className="btn btn-primary" disabled={busy||loading||failed||!options.length}>{busy?<span className="spinner"/>:<FiPlus/>} ثبت مرسوله و اقلام</button></div>
  </form></section></div>
}

function ShipmentDetails({shipment,onClose}) { return <div className="modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section className="modal-card"><div className="modal-heading"><div><span className="eyebrow">جزئیات مرسوله</span><h2>{shipment.shipment_number}</h2></div><button className="icon-button" onClick={onClose} aria-label="بستن"><FiX/></button></div><div className="shipment-detail-grid"><span>سند مرتبط <strong>{shipment.document?.document_no||'—'}</strong></span><span>طرف‌حساب <strong>{shipment.partner?.name||'—'}</strong></span><span>جهت <strong>{shipment.direction==='INBOUND'?'دریافت':'ارسال'}</strong></span><span>وضعیت <strong>{statuses[shipment.status]||shipment.status}</strong></span><span>حمل‌کننده <strong>{shipment.carrier||'—'}</strong></span><span>شماره پیگیری <strong>{shipment.tracking_number||'—'}</strong></span><span>یادداشت <strong>{shipment.notes||'—'}</strong></span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>کالا</th><th>مقدار</th><th>واحد</th><th>یادداشت</th></tr></thead><tbody>{(shipment.items||[]).map(item=><tr key={item.id}><td>{item.product?.name||item.product_id}</td><td>{formatQuantity(item.quantity)}</td><td>{item.product?.unit||'—'}</td><td>{item.notes||'—'}</td></tr>)}</tbody></table></div><div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>بستن</button></div></section></div> }
