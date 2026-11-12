import { formatPersianDate } from '../utils/persianDate'
import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertCircle, FiChevronLeft, FiChevronRight, FiEdit2, FiEye, FiPlus, FiPrinter, FiRefreshCw, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import SearchableSelect from '../components/SearchableSelect'
import PurchaseLinesEditor from '../components/PurchaseLinesEditor'
import PurchasePrintSheet from '../components/PurchasePrintSheet'
import CommercialCurrencyFields from '../components/CommercialCurrencyFields'
import { calculatePurchaseOrderLine, formatCurrency, parsePercent, quantityPrice } from '../utils/purchaseAmounts'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'

const itemsOf = (data) => Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
const statusName = (status) => status === 'OPEN' ? 'باز' : status === 'CANCELLED' ? 'لغوشده' : status || '—'
const amount = (value) => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const documentAmount = (doc) => { const currency=doc.currency||'IRR', transactionValue=doc.transaction_amounts?.total; return currency==='IRR'?amount(doc.total_amount):`${formatCurrency(transactionValue??doc.total_amount,currency)} · ${amount(doc.total_amount)} معادل` }
const quantity = (value) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 }).format(Number(value || 0))
const newLine = () => ({ productId: '', quantity: '1', unitPrice: '', discountAmount: '', discountPercent: '0' })

export default function SalesOrdersPage({ resource }) {
  const user = useSelector((state) => state.session.user)
  const permissions = user?.permissions || []
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const canRead = isAdmin || permissions.includes('sales.orders.read')
  const canCreate = isAdmin || permissions.includes('sales.orders.create')
  const canUpdate = isAdmin || permissions.includes('sales.orders.update')
  const canCancel = isAdmin || permissions.includes('sales.orders.cancel')
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [details, setDetails] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const queryString = `?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}`
  const ordersQuery = useQuery({
    queryKey: ['sales-orders', page, search, status],
    queryFn: async () => unwrap(await api.get(`${resource.endpoint}${queryString}`)),
    enabled: canRead,
  })
  const orders = itemsOf(ordersQuery.data)
  const total = Number(ordersQuery.data?.pagination?.totalItems || 0)
  const orderToExport = order => [order.document_no, order.partner_name || order.partner?.name || '—', documentAmount(order), statusName(order.status), order.created_at ? formatPersianDate(order.created_at) : '—', order.note || '—']
  const loadOrderExport = async () => { const params = new URLSearchParams(); if (search) params.set('search', search); if (status) params.set('status', status); return (await fetchAllPages(`${resource.endpoint}${params.size ? `?${params}` : ''}`)).map(orderToExport) }
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
  const createOrder = useMutation({
    mutationFn: async (payload) => unwrap(await api.post(resource.endpoint, payload)),
    onSuccess: () => { toast.success('سفارش فروش ثبت شد'); setModal(false); invalidate() },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const updateOrder = useMutation({
    mutationFn: async ({ id, payload }) => unwrap(await api.patch(`${resource.endpoint}/${id}`, payload)),
    onSuccess: () => { toast.success('سفارش فروش ویرایش شد'); setEditing(null); invalidate() },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const cancelOrder = useMutation({
    mutationFn: async ({ id, reason }) => unwrap(await api.post(`${resource.endpoint}/${id}/cancel`, { reason })),
    onSuccess: () => { toast.success('سفارش فروش لغو شد'); setCancelling(null); invalidate() },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (!canRead) return <section className="resource-page"><div className="panel error-state"><FiAlertCircle/><strong>دسترسی به سفارش فروش برای حساب شما فعال نیست</strong></div></section>

  return <section className="resource-page">
    <div className="page-heading">
      <div><div className="eyebrow">پنل مدیریت <FiChevronLeft/> بازرگانی</div><h1>{resource.label}</h1><p>ثبت و پیگیری سفارش‌های فروش از مشتریان.</p></div>
      <div className="heading-actions"><DataExportActions title="سفارش‌های فروش" headers={["شماره سفارش","مشتری","مبلغ کل","وضعیت","تاریخ ثبت","یادداشت"]} loadRows={loadOrderExport} subtitle="همهٔ نتایج با جستجو و فیلتر جاری"/><button className="btn btn-secondary" disabled={ordersQuery.isFetching} onClick={() => invalidate()}><FiRefreshCw/> بروزرسانی</button>{canCreate && <button className="btn btn-primary" onClick={() => setModal(true)}><FiPlus/> ثبت سفارش فروش</button>}</div>
    </div>
    <div className="resource-stats"><div><span className="resource-stat-icon">خ</span><div><strong>{new Intl.NumberFormat('fa-IR').format(total)}</strong><small>سفارش ثبت‌شده</small></div></div><span className="live-indicator"><i/> همگام با سامانه</span></div>
    <div className="panel resource-panel">
      <div className="table-toolbar"><div className="resource-tabs"><button className="tab active">سفارش‌ها <span>{new Intl.NumberFormat('fa-IR').format(total)}</span></button></div><div className="table-tools">
        <label className="table-search"><FiSearch/><input placeholder="جستجو در شماره سفارش یا مشتری..." value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }}/><kbd>/</kbd></label>
        <SearchableSelect className="form-control" aria-label="فیلتر وضعیت سفارش" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}><option value="">همه وضعیت‌ها</option><option value="OPEN">باز</option><option value="CANCELLED">لغوشده</option></SearchableSelect>
      </div></div>
      {ordersQuery.isError ? <div className="error-state"><FiAlertCircle/><strong>دریافت سفارش‌ها انجام نشد</strong><span>{getErrorMessage(ordersQuery.error)}</span><button className="btn btn-secondary" onClick={() => ordersQuery.refetch()}>تلاش دوباره</button></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>شماره سفارش</th><th>مشتری</th><th>مبلغ کل</th><th>وضعیت</th><th>تاریخ ثبت</th><th>عملیات</th></tr></thead><tbody>
        {ordersQuery.isLoading ? Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan="6"><div className="skeleton-row"/></td></tr>) : orders.length ? orders.map((order) => <tr key={order.id}>
          <td><strong>{order.document_no}</strong></td><td>{order.partner_name || order.partner?.name || '—'}</td><td className="number-cell">{documentAmount(order)}</td><td><span className={`status-pill ${order.status === 'OPEN' ? 'status-green' : 'status-neutral'}`}>{statusName(order.status)}</span></td><td>{order.created_at ? formatPersianDate(order.created_at) : '—'}</td>
          <td><div className="heading-actions"><button className="icon-button" title="جزئیات سفارش" aria-label={`جزئیات ${order.document_no}`} onClick={() => setDetails(order)}><FiEye/></button>{order.status === 'OPEN' && canUpdate && <button className="icon-button" title="ویرایش سفارش" aria-label={`ویرایش ${order.document_no}`} onClick={() => setEditing(order)}><FiEdit2/></button>}{order.status === 'OPEN' && canCancel && <button className="icon-button" title="لغو سفارش" aria-label={`لغو ${order.document_no}`} onClick={() => setCancelling(order)}><FiTrash2/></button>}</div></td>
        </tr>) : <tr><td colSpan="6"><div className="empty-state"><strong>سفارشی برای نمایش نیست</strong><span>{search || status ? 'فیلترها را تغییر دهید.' : 'هنوز سفارش فروشی ثبت نشده است.'}</span>{canCreate && <button className="btn btn-primary" onClick={() => setModal(true)}><FiPlus/> ثبت اولین سفارش</button>}</div></td></tr>}
      </tbody></table></div>}
      <div className="table-footer"><span>نمایش <b>{new Intl.NumberFormat('fa-IR').format(orders.length ? (page - 1) * 20 + 1 : 0)} تا {new Intl.NumberFormat('fa-IR').format((page - 1) * 20 + orders.length)}</b> از <b>{new Intl.NumberFormat('fa-IR').format(total)}</b> سفارش</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronRight/></button><span>صفحه {new Intl.NumberFormat('fa-IR').format(page)}</span><button disabled={orders.length < 20} onClick={() => setPage(page + 1)}><FiChevronLeft/></button></div></div>
    </div>
    {modal && <SalesOrderForm busy={createOrder.isPending} onClose={() => setModal(false)} onSubmit={(payload) => createOrder.mutate(payload)}/>}
    {editing && <SalesOrderForm key={editing.id} initial={editing} busy={updateOrder.isPending} onClose={() => setEditing(null)} onSubmit={(payload) => updateOrder.mutate({ id: editing.id, payload })}/>}
    {details && <OrderDetails order={details} onClose={() => setDetails(null)}/>}
    {cancelling && <CancelOrderDialog order={cancelling} busy={cancelOrder.isPending} onClose={() => setCancelling(null)} onSubmit={(reason) => cancelOrder.mutate({ id: cancelling.id, reason })}/>}
  </section>
}

function SalesOrderForm({ initial, busy, onClose, onSubmit }) {
  const [partnerId, setPartnerId] = useState(initial?.partner_id || '')
  const [selectedPartner, setSelectedPartner] = useState(initial?.partner_id ? { id: initial.partner_id, code: '', name: initial.partner_name } : null)
  const [note, setNote] = useState(initial?.note || '')
  const [currency, setCurrency] = useState(initial?.currency || 'IRR')
  const [exchangeRate, setExchangeRate] = useState(String(initial?.exchange_rate || '1'))
  const [dueDate, setDueDate] = useState(initial?.due_date || '')
  const [lines, setLines] = useState(() => initial?.items?.length ? [...initial.items.map((item) => ({ productId: item.product_id, quantity: String(item.quantity), unitPrice: String(item.transaction_amounts?.unit_price ?? item.unit_price), discountAmount: String(item.transaction_amounts?.discount_amount ?? item.discount_amount ?? 0), discountPercent: String(item.discount_percent || 0) })), ...(initial.items.length < 100 ? [newLine()] : [])] : [newLine()])
  const [partnerSearch, setPartnerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedProducts, setSelectedProducts] = useState(() => (initial?.items || []).map((item) => item.product).filter(Boolean))
  const [error, setError] = useState('')
  const partnersQuery = useQuery({ queryKey: ['purchase-order-partners', partnerSearch], queryFn: async () => unwrap(await api.get(`/commercial/partners?type=CUSTOMER&is_active=1&limit=20${partnerSearch ? `&search=${encodeURIComponent(partnerSearch)}` : ''}`)) })
  const productsQuery = useQuery({ queryKey: ['purchase-order-products', productSearch], queryFn: async () => unwrap(await api.get(`/products?is_active=1&limit=20${productSearch ? `&search=${encodeURIComponent(productSearch)}` : ''}`)) })
  const partners = itemsOf(partnersQuery.data)
  const products = itemsOf(productsQuery.data)
  const availablePartners = useMemo(() => {
    const options = [...partners]
    if (selectedPartner && !options.some((partner) => partner.id === selectedPartner.id)) options.push(selectedPartner)
    if (initial?.partner_id && !options.some((partner) => partner.id === initial.partner_id)) options.push({ id: initial.partner_id, code: '', name: initial.partner_name })
    return options
  }, [partners, selectedPartner, initial])
  const availableProducts = useMemo(() => {
    const options = [...products]
    for (const product of selectedProducts) if (!options.some((item) => item.id === product.id)) options.push(product)
    return options
  }, [products, selectedProducts])
  const total = useMemo(() => lines.filter((line) => line.productId).reduce((sum, line) => sum + calculatePurchaseOrderLine(line).total, 0n), [lines])
  const setLine = (index, key, value) => setLines((current) => {
    const next = current.map((line, row) => row === index ? { ...line, [key]: value } : line)
    const line = next[index]
    const complete = line?.productId && /^\d+(\.\d{1,3})?$/.test(String(line.quantity)) && Number(line.quantity) > 0 && line.unitPrice !== '' && Number.isSafeInteger(Number(line.unitPrice)) && Number(line.unitPrice) >= 0
    if (index === next.length - 1 && complete && next.length < 100) next.push(newLine())
    return next
  })
  const selectProduct = (index, id, selectedProduct) => {
    const product = selectedProduct || availableProducts.find((item) => item.id === id)
    if (product) setSelectedProducts((current) => current.some((item) => item.id === id) ? current : [...current, product])
    setLine(index, 'productId', id)
  }
  const submit = (event) => {
    event.preventDefault()
    const submittedLines = lines.filter((line) => line.productId)
    const ids = submittedLines.map((line) => line.productId)
    if (!initial && !partnerId) return setError('مشتری را انتخاب کنید.')
    if (currency !== 'IRR' && !/^[1-9][0-9]{0,17}$/.test(String(exchangeRate))) return setError('نرخ تبدیل هر واحد ارز به ریال را وارد کنید.')
    if (!submittedLines.length || submittedLines.some((line) => !/^\d+(\.\d{1,3})?$/.test(String(line.quantity)) || !(Number(line.quantity) > 0) || Number(line.quantity) > 999999999999.999 || line.unitPrice === '' || !Number.isSafeInteger(Number(line.unitPrice)) || Number(line.unitPrice) < 0 || parsePercent(line.discountPercent || '0') === null || !/^\d*$/.test(String(line.discountAmount || '')) || BigInt(line.discountAmount || 0) + (quantityPrice(line.quantity, line.unitPrice) * (parsePercent(line.discountPercent || '0') || 0n) + 500000n) / 1000000n > quantityPrice(line.quantity, line.unitPrice))) return setError('مقدار، قیمت و تخفیف هر ردیف را بررسی کنید؛ تخفیف نمی‌تواند از مبلغ ردیف بیشتر باشد.')
    if (new Set(ids).size !== ids.length) return setError('هر کالا را فقط یک‌بار به سفارش اضافه کنید.')
    if (total > 999999999999999999n) return setError('مبلغ کل سفارش از سقف مجاز بیشتر است.')
    setError('')
    const payload = { currency, exchangeRate: currency === 'IRR' ? '1' : String(exchangeRate), dueDate: dueDate || null, items: submittedLines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice), discountPercent: Number(line.discountPercent || 0), discountAmount: Number(line.discountAmount || 0) })), note: note.trim() || null }
    if (!initial || partnerId !== initial.partner_id) payload.partnerId = partnerId
    onSubmit(payload)
  }
  const loading = partnersQuery.isLoading || productsQuery.isLoading
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card purchase-order-modal"><div className="modal-heading"><div><span className="eyebrow">{initial ? 'ویرایش سفارش باز' : 'سفارش جدید'}</span><h2>{initial ? 'ویرایش سفارش فروش' : 'ثبت سفارش فروش'}</h2></div><button className="icon-button" type="button" aria-label="بستن" onClick={onClose}><FiX/></button></div>
    <form className="modal-form" onSubmit={submit}><label className="form-field purchase-order-full"><span>{initial ? 'مشتری فعلی' : 'مشتری *'}</span><SearchableSelect name="purchase-order-partner" value={partnerId} options={availablePartners} onChange={(id, partner) => { setPartnerId(id); setSelectedPartner(partner) }} onSearch={setPartnerSearch} loading={partnersQuery.isFetching} getOptionLabel={(partner) => `${partner.name}${partner.code ? ` (${partner.code})` : ''}`} placeholder="نام یا کد مشتری را جست‌وجو کنید" emptyLabel="مشتری‌ای پیدا نشد"/></label>
      <div className="purchase-order-full purchase-invoice-adjustments"><CommercialCurrencyFields currency={currency} setCurrency={setCurrency} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate} dueDate={dueDate} setDueDate={setDueDate}/></div>
      <div className="purchase-order-lines purchase-order-full"><div className="purchase-order-lines-head"><strong>اقلام سفارش</strong><span className="purchase-order-auto-hint">با تکمیل مقدار و قیمت، ردیف بعدی خودکار آماده می‌شود.</span></div><PurchaseLinesEditor currency={currency} lines={lines} products={availableProducts} loading={productsQuery.isFetching} onSearch={setProductSearch} onSelectProduct={selectProduct} onChange={setLine} onRemove={(index) => setLines((current) => current.filter((_, row) => row !== index))}/></div>
      <label className="form-field purchase-order-full"><span>یادداشت</span><textarea className="form-control" rows="3" value={note} onChange={(event) => setNote(event.target.value)}/></label>
      <div className="purchase-order-summary purchase-order-full"><span>جمع کل سفارش</span><strong>{formatCurrency(total,currency)}{currency!=='IRR'&&` · ${formatCurrency(total*BigInt(exchangeRate||0), 'IRR')} معادل`}</strong></div>
      {error && <small className="purchase-order-error purchase-order-full">{error}</small>}
      {partnersQuery.isError || productsQuery.isError ? <small className="purchase-order-error purchase-order-full">دریافت فهرست مشتریان یا کالاها انجام نشد؛ جستجو را تغییر دهید یا دوباره تلاش کنید.</small> : null}
      {!loading && (!availablePartners.length || !availableProducts.length) && <small className="purchase-order-error purchase-order-full">برای ثبت سفارش، دست‌کم یک مشتریٔ فعال و یک کالای فعال لازم است.</small>}
      <div className="modal-actions purchase-order-full"><button type="button" className="btn btn-secondary" onClick={onClose}>انصراف</button><button className="btn btn-primary" disabled={busy || loading || !availablePartners.length || !availableProducts.length}>{busy ? <span className="spinner"/> : <FiPlus/>}{initial ? 'ذخیره تغییرات' : 'ثبت سفارش'}</button></div>
    </form>
  </section></div>
}

function OrderDetails({ order, onClose }) {
  const date = order.created_at ? formatPersianDate(order.created_at, true) : '—'
  const items = order.items || []
  const formatOrderAmount = (value, transactionValue) => order.currency && order.currency !== 'IRR' ? formatCurrency(transactionValue ?? value, order.currency) : amount(value)
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card purchase-order-modal"><div className="modal-heading"><div><span className="eyebrow">جزئیات سفارش</span><h2>{order.document_no}</h2></div><div className="purchase-detail-actions"><button type="button" className="btn btn-secondary" onClick={() => window.print()}><FiPrinter/> چاپ</button><button className="icon-button" aria-label="بستن" onClick={onClose}><FiX/></button></div></div><div className="order-detail-meta"><span>مشتری: <strong>{order.partner_name || '—'}</strong></span><span>وضعیت: <strong>{statusName(order.status)}</strong></span><span>تاریخ ثبت: <strong>{date}</strong></span>{order.note && <span>یادداشت: <strong>{order.note}</strong></span>}</div><div className="table-scroll"><table className="data-table"><thead><tr><th>ردیف</th><th>کد کالا</th><th>نام کالا</th><th>مقدار</th><th>واحد</th><th>مبلغ واحد</th><th>تخفیف مبلغی</th><th>تخفیف درصدی</th><th>جمع کل سطر</th></tr></thead><tbody>{items.map((item,index) => <tr key={item.product_id}><td>{new Intl.NumberFormat('fa-IR').format(index+1)}</td><td>{item.product?.code || '—'}</td><td>{item.product?.name || item.product_id}</td><td>{quantity(item.quantity)}</td><td>{item.product?.unit || '—'}</td><td>{formatOrderAmount(item.unit_price,item.transaction_amounts?.unit_price)}</td><td>{formatOrderAmount(item.discount_amount,item.transaction_amounts?.discount_amount)}</td><td>{new Intl.NumberFormat('fa-IR').format(Number(item.discount_percent||0))}٪</td><td>{formatOrderAmount(item.line_total,item.transaction_amounts?.line_total)}</td></tr>)}</tbody><tfoot><tr><th colSpan="8">مبلغ نهایی سفارش</th><th>{formatOrderAmount(order.total_amount,order.transaction_amounts?.total)}</th></tr></tfoot></table></div></section><PurchasePrintSheet title="سفارش فروش" templateType="پیش‌فاکتور" documentNo={order.document_no} date={date} dueDate={order.due_date} description={order.note} detailsTitle="مشخصات مشتری" details={[["نام مشتری", order.partner_name || order.partner?.name], ["کد طرف حساب", order.partner?.code], ["شماره تماس", order.partner?.phone || order.partner?.mobile], ["نشانی", order.partner?.address]].filter(([, value]) => value)} columns={["ردیف", "کد کالا", "نام کالا", "مقدار", "واحد", "مبلغ واحد", "تخفیف مبلغی", "تخفیف درصدی", "جمع کل سطر"]} rows={items.map((item, index) => ({ key: item.product_id, cells: [new Intl.NumberFormat('fa-IR').format(index + 1), item.product?.code || '—', item.product?.name || item.product_id, quantity(item.quantity), item.product?.unit || '—', formatOrderAmount(item.unit_price,item.transaction_amounts?.unit_price), formatOrderAmount(item.discount_amount,item.transaction_amounts?.discount_amount), `${new Intl.NumberFormat('fa-IR').format(Number(item.discount_percent || 0))}٪`, formatOrderAmount(item.line_total,item.transaction_amounts?.line_total)] }))} summary={[["جمع خالص سفارش", formatOrderAmount(order.total_amount,order.transaction_amounts?.total), true]]} note={order.note}/></div>
}

function CancelOrderDialog({ order, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card"><div className="modal-heading"><div><span className="eyebrow">لغو سفارش فروش</span><h2>{order.document_no}</h2></div><button className="icon-button" aria-label="بستن" onClick={onClose}><FiX/></button></div><form className="modal-form" onSubmit={(event) => { event.preventDefault(); if (reason.trim().length < 1) return setError('دلیل لغو را وارد کنید.'); onSubmit(reason.trim()) }}><label className="form-field purchase-order-full"><span>دلیل لغو *</span><textarea className="form-control" rows="4" maxLength={2000} value={reason} onChange={(event) => { setReason(event.target.value); setError('') }}/></label>{error && <small className="purchase-order-error purchase-order-full">{error}</small>}<div className="modal-actions purchase-order-full"><button type="button" className="btn btn-secondary" onClick={onClose}>بازگشت</button><button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner"/> : <FiTrash2/>} لغو سفارش</button></div></form></section></div>
}
