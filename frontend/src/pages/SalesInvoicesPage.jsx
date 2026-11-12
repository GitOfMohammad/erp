import { formatPersianDate } from '../utils/persianDate'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FiAlertCircle, FiChevronLeft, FiChevronRight, FiEdit2, FiEye, FiPlus, FiPrinter, FiRefreshCw, FiX, FiCheck, FiSlash } from 'react-icons/fi'
import { api, getErrorMessage, unwrap } from '../services/api'
import SearchableSelect from '../components/SearchableSelect'
import PurchaseLinesEditor from '../components/PurchaseLinesEditor'
import FormattedNumberInput from '../components/FormattedNumberInput'
import CommercialCurrencyFields from '../components/CommercialCurrencyFields'
import PurchasePrintSheet from '../components/PurchasePrintSheet'
import CommercialSettlementsPanel from '../components/CommercialSettlementsPanel'
import { calculatePurchaseInvoice, formatCurrency, formatRial, parsePercent, quantityPrice } from '../utils/purchaseAmounts'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'

const itemsOf = (data) => Array.isArray(data) ? data : data?.items || data?.rows || data?.results || []
const amount = (value) => `${new Intl.NumberFormat('fa-IR').format(BigInt(value || 0))} ریال`
const documentAmount = (doc) => { const currency=doc.currency||'IRR', transactionValue=doc.transaction_amounts?.total; return currency==='IRR'?amount(doc.total_amount):`${formatCurrency(transactionValue??doc.total_amount,currency)} · ${amount(doc.total_amount)} معادل` }
const quantity = (value) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 }).format(Number(value || 0))
const statuses = { PENDING_APPROVAL: 'در انتظار تأیید', APPROVED: 'تأییدشده', REJECTED: 'ردشده' }
const emptyLine = () => ({ productId: '', quantity: '1', unitPrice: '', discountAmount: '', discountPercent: '0', taxPercent: '0' })

export default function SalesInvoicesPage({ resource }) {
  const user = useSelector((state) => state.session.user)
  const permissions = user?.permissions || []
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const canRead = isAdmin || permissions.includes('sales.invoices.read')
  const canCreate = isAdmin || permissions.includes('sales.invoices.create')
  const canUpdate = isAdmin || permissions.includes('sales.invoices.update')
  const canApprove = isAdmin || permissions.includes('sales.invoices.approve')
  const canSettle = isAdmin || permissions.includes('sales.invoices.settle')
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const query = useQuery({
    queryKey: ['sales-invoices', page, search, status],
    queryFn: async () => unwrap(await api.get(`${resource.endpoint}?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}`)),
    enabled: canRead,
  })
  const invoices = itemsOf(query.data)
  const total = Number(query.data?.pagination?.totalItems || 0)
  const invoiceToExport = invoice => [invoice.document_no, invoice.partner_name || invoice.partner?.name || '—', invoice.warehouse?.name || '—', documentAmount(invoice), statuses[invoice.status] || invoice.status, invoice.created_at ? formatPersianDate(invoice.created_at) : '—', invoice.note || '—']
  const loadInvoiceExport = async () => { const params = new URLSearchParams(); if (search) params.set('search', search); if (status) params.set('status', status); return (await fetchAllPages(`${resource.endpoint}${params.size ? `?${params}` : ''}`)).map(invoiceToExport) }
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
  const createInvoice = useMutation({
    mutationFn: async (payload) => unwrap(await api.post(resource.endpoint, payload)),
    onSuccess: () => { toast.success('فاکتور فروش ثبت شد و در انتظار تأیید است'); setCreating(false); invalidate() },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const updateInvoice = useMutation({
    mutationFn: async ({ id, payload }) => unwrap(await api.patch(`${resource.endpoint}/${id}`, payload)),
    onSuccess: () => { toast.success('فاکتور فروش ویرایش شد'); setEditing(null); invalidate() },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const decideInvoice = useMutation({
    mutationFn: async ({ id, decision, rejectionReason }) => unwrap(await api.post(`${resource.endpoint}/${id}/decision`, { decision, ...(rejectionReason ? { rejectionReason } : {}) })),
    onSuccess: (_, variables) => { toast.success(variables.decision === 'APPROVE' ? 'فاکتور تأیید شد و گردش موجودی ثبت شد' : 'فاکتور رد شد'); setSelected(null); invalidate(); if (variables.decision === 'APPROVE') { queryClient.invalidateQueries({ queryKey: ['resource', '/products'] }); queryClient.invalidateQueries({ queryKey: ['resource', '/inventory/stock'] }) } },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (!canRead) return <section className="resource-page"><div className="panel error-state"><FiAlertCircle/><strong>دسترسی به فاکتور فروش برای حساب شما فعال نیست</strong></div></section>

  const approve = (invoice) => {
    if (window.confirm(`فاکتور ${invoice.document_no} تأیید شود؟ این کار موجودی انبار و سند مالی را ثبت می‌کند.`)) decideInvoice.mutate({ id: invoice.id, decision: 'APPROVE' })
  }
  const reject = (invoice) => {
    const rejectionReason = window.prompt(`دلیل رد فاکتور ${invoice.document_no} را وارد کنید:`)
    if (rejectionReason?.trim()) decideInvoice.mutate({ id: invoice.id, decision: 'REJECT', rejectionReason: rejectionReason.trim() })
  }

  return <section className="resource-page">
    <div className="page-heading"><div><div className="eyebrow">پنل مدیریت <FiChevronLeft/> بازرگانی</div><h1>{resource.label}</h1><p>ثبت، بررسی و پیگیری فاکتورهای فروش از مشتریان.</p></div><div className="heading-actions"><DataExportActions title="فاکتورهای فروش" headers={["شماره فاکتور","مشتری","انبار","مبلغ کل","وضعیت","تاریخ ثبت","یادداشت"]} loadRows={loadInvoiceExport} subtitle="همهٔ نتایج با جستجو و فیلتر جاری"/><button className="btn btn-secondary" disabled={query.isFetching} onClick={invalidate}><FiRefreshCw/> بروزرسانی</button>{canCreate && <button className="btn btn-primary" onClick={() => setCreating(true)}><FiPlus/> ثبت فاکتور فروش</button>}</div></div>
    <div className="resource-stats"><div><span className="resource-stat-icon">ف</span><div><strong>{new Intl.NumberFormat('fa-IR').format(total)}</strong><small>فاکتور ثبت‌شده</small></div></div><span className="live-indicator"><i/> همگام با سامانه</span></div>
    <div className="panel resource-panel"><div className="table-toolbar"><div className="resource-tabs"><button className="tab active">فاکتورها <span>{new Intl.NumberFormat('fa-IR').format(total)}</span></button></div><div className="table-tools"><label className="table-search"><input placeholder="جستجو در شماره فاکتور یا مشتری..." value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }}/></label><SearchableSelect className="form-control" aria-label="فیلتر وضعیت فاکتور" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}><option value="">همه وضعیت‌ها</option><option value="PENDING_APPROVAL">در انتظار تأیید</option><option value="APPROVED">تأییدشده</option><option value="REJECTED">ردشده</option></SearchableSelect></div></div>
      {query.isError ? <div className="error-state"><FiAlertCircle/><strong>دریافت فاکتورها انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>شماره فاکتور</th><th>مشتری</th><th>انبار</th><th>مبلغ کل</th><th>وضعیت</th><th>تاریخ ثبت</th><th>عملیات</th></tr></thead><tbody>
        {query.isLoading ? Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan="7"><div className="skeleton-row"/></td></tr>) : invoices.length ? invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.document_no}</strong></td><td>{invoice.partner_name || invoice.partner?.name || '—'}</td><td>{invoice.warehouse?.name || '—'}</td><td className="number-cell">{amount(invoice.total_amount)}</td><td><span className={`status-pill ${invoice.status === 'APPROVED' ? 'status-green' : 'status-neutral'}`}>{statuses[invoice.status] || invoice.status}</span></td><td>{invoice.created_at ? formatPersianDate(invoice.created_at) : '—'}</td><td><div className="heading-actions"><button className="icon-button" title="جزئیات فاکتور" aria-label={`جزئیات ${invoice.document_no}`} onClick={() => setSelected(invoice)}><FiEye/></button>{canUpdate && invoice.status === 'PENDING_APPROVAL' && <button className="icon-button" title="ویرایش فاکتور" aria-label={`ویرایش ${invoice.document_no}`} onClick={() => setEditing(invoice)}><FiEdit2/></button>}{canApprove && invoice.status === 'PENDING_APPROVAL' && <><button className="icon-button" title="تأیید فاکتور" aria-label={`تأیید ${invoice.document_no}`} onClick={() => approve(invoice)}><FiCheck/></button><button className="icon-button" title="رد فاکتور" aria-label={`رد ${invoice.document_no}`} onClick={() => reject(invoice)}><FiSlash/></button></>}</div></td></tr>) : <tr><td colSpan="7"><div className="empty-state"><strong>فاکتوری برای نمایش نیست</strong><span>{search || status ? 'عبارت جستجو یا فیلتر را تغییر دهید.' : 'هنوز فاکتور فروشی ثبت نشده است.'}</span>{canCreate && <button className="btn btn-primary" onClick={() => setCreating(true)}><FiPlus/> ثبت اولین فاکتور</button>}</div></td></tr>}
      </tbody></table></div>}
      <div className="table-footer"><span>نمایش <b>{new Intl.NumberFormat('fa-IR').format(invoices.length ? (page - 1) * 20 + 1 : 0)} تا {new Intl.NumberFormat('fa-IR').format((page - 1) * 20 + invoices.length)}</b> از <b>{new Intl.NumberFormat('fa-IR').format(total)}</b> فاکتور</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronRight/></button><span>صفحه {new Intl.NumberFormat('fa-IR').format(page)}</span><button disabled={invoices.length < 20} onClick={() => setPage(page + 1)}><FiChevronLeft/></button></div></div>
    </div>
    {creating && <SalesInvoiceForm busy={createInvoice.isPending} onClose={() => setCreating(false)} onSubmit={(payload) => createInvoice.mutate(payload)}/>}
    {editing && <SalesInvoiceForm initial={editing} busy={updateInvoice.isPending} onClose={() => setEditing(null)} onSubmit={(payload) => updateInvoice.mutate({ id: editing.id, payload })}/>}
    {selected && <InvoiceDetails invoice={selected} onClose={() => setSelected(null)} onApprove={() => approve(selected)} onReject={() => reject(selected)} canApprove={canApprove} canSettle={canSettle} busy={decideInvoice.isPending}/>}
  </section>
}

function SalesInvoiceForm({ initial, busy, onClose, onSubmit }) {
  const [partnerId, setPartnerId] = useState(initial?.partner_id || '')
  const [selectedPartner, setSelectedPartner] = useState(initial ? { id: initial.partner_id, code: initial.partner?.code || '', name: initial.partner_name || initial.partner?.name } : null)
  const [warehouseId, setWarehouseId] = useState(initial?.warehouse_id || '')
  const inventorySettingsQuery = useQuery({ queryKey: ['settings', 'inventory', 'defaults'], queryFn: async () => unwrap(await api.get('/settings/inventory/defaults')), enabled: !initial })
  useEffect(() => { if (!initial && !warehouseId && inventorySettingsQuery.data?.salesWarehouseId) setWarehouseId(inventorySettingsQuery.data.salesWarehouseId) }, [initial, warehouseId, inventorySettingsQuery.data])
  const [orderId, setOrderId] = useState(initial?.order_document_id || '')
  const [selectedOrder, setSelectedOrder] = useState(initial?.order_document_id ? { ...initial.orderDocument, id: initial.order_document_id, partner_id: initial.partner_id, partner_name: initial.partner_name } : null)
  const [currency, setCurrency] = useState(initial?.currency || 'IRR')
  const [exchangeRate, setExchangeRate] = useState(String(initial?.exchange_rate || '1'))
  const [dueDate, setDueDate] = useState(initial?.due_date || '')
  const [salesRepresentativeId, setSalesRepresentativeId] = useState(initial?.sales_representative_id || '')
  const [selectedSalesRepresentative, setSelectedSalesRepresentative] = useState(initial?.salesRepresentative || null)
  const [note, setNote] = useState(initial?.note || '')
  const [lines, setLines] = useState(() => initial?.items?.length ? [...initial.items.map((item) => ({ productId: item.product_id, quantity: String(item.quantity), unitPrice: String(item.transaction_amounts?.unit_price ?? item.unit_price), discountAmount: String(item.transaction_amounts?.discount_amount ?? item.discount_amount ?? 0), discountPercent: String(item.discount_percent || 0), taxPercent: String(item.tax_percent || 0) })), ...(initial.items.length < 100 ? [emptyLine()] : [])] : [emptyLine()])
  const [discountPercent, setDiscountPercent] = useState(String(initial?.discount_percent || 0))
  const [discountAmount, setDiscountAmount] = useState(String(initial?.discount_amount || ''))
  const [freightAmount, setFreightAmount] = useState(String(initial?.freight_amount || ''))
  const [roundingUnit, setRoundingUnit] = useState(String(initial?.rounding_unit || 1))
  const [roundingMethod, setRoundingMethod] = useState(initial?.rounding_method || 'NEAREST')
  const [partnerSearch, setPartnerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [selectedProducts, setSelectedProducts] = useState(() => (initial?.items || []).map((item) => item.product).filter(Boolean))
  const [error, setError] = useState('')
  const partnersQuery = useQuery({ queryKey: ['sales-invoice-partners', partnerSearch], queryFn: async () => unwrap(await api.get(`/commercial/partners?type=CUSTOMER&is_active=1&limit=20${partnerSearch ? `&search=${encodeURIComponent(partnerSearch)}` : ''}`)) })
  const productsQuery = useQuery({ queryKey: ['sales-invoice-products', productSearch], queryFn: async () => unwrap(await api.get(`/products?is_active=1&limit=20${productSearch ? `&search=${encodeURIComponent(productSearch)}` : ''}`)) })
  const warehousesQuery = useQuery({ queryKey: ['sales-invoice-warehouses'], queryFn: async () => ({ items: await fetchAllPages('/inventory/warehouses?is_active=1') }) })
  const ordersQuery = useQuery({ queryKey: ['sales-invoice-orders', orderSearch], queryFn: async () => unwrap(await api.get(`/commercial/sales/orders?status=OPEN&limit=20${orderSearch ? `&search=${encodeURIComponent(orderSearch)}` : ''}`)) })
  const salesRepresentativesQuery = useQuery({ queryKey: ['sales-invoice-representatives'], queryFn: async () => ({ items: await fetchAllPages('/commercial/sales-representatives?status=ACTIVE') }) })
  const partners = itemsOf(partnersQuery.data)
  const products = itemsOf(productsQuery.data)
  const warehouses = itemsOf(warehousesQuery.data)
  const orders = itemsOf(ordersQuery.data)
  const salesRepresentatives = itemsOf(salesRepresentativesQuery.data)
  const salesRepresentativeOptions = useMemo(() => selectedSalesRepresentative && !salesRepresentatives.some((rep) => rep.id === selectedSalesRepresentative.id) ? [...salesRepresentatives, selectedSalesRepresentative] : salesRepresentatives, [salesRepresentatives, selectedSalesRepresentative])
  const partnerOptions = useMemo(() => selectedPartner && !partners.some((partner) => partner.id === selectedPartner.id) ? [...partners, selectedPartner] : partners, [partners, selectedPartner])
  const productOptions = useMemo(() => {
    const options = [...products]
    for (const product of selectedProducts) if (!options.some((item) => item.id === product.id)) options.push(product)
    return options
  }, [products, selectedProducts])
  const orderOptions = useMemo(() => selectedOrder && !orders.some((order) => order.id === selectedOrder.id) ? [...orders, selectedOrder] : orders, [orders, selectedOrder])
  const calculation = useMemo(() => calculatePurchaseInvoice(lines, { discountPercent, discountAmount, freightAmount, roundingUnit, roundingMethod }), [lines, discountPercent, discountAmount, freightAmount, roundingUnit, roundingMethod])
  const total = calculation.total
  const setLine = (index, key, value) => setLines((current) => {
    const next = current.map((line, i) => i === index ? { ...line, [key]: value } : line)
    const line = next[index]
    const complete = line?.productId && /^\d+(\.\d{1,3})?$/.test(String(line.quantity)) && Number(line.quantity) > 0 && line.unitPrice !== '' && Number.isSafeInteger(Number(line.unitPrice)) && Number(line.unitPrice) >= 0
    if (index === next.length - 1 && complete && next.length < 100) next.push(emptyLine())
    return next
  })
  const selectProduct = (index, id, product) => {
    if (product) setSelectedProducts((current) => current.some((item) => item.id === id) ? current : [...current, product])
    setLines((current) => {
      const next = current.map((line, row) => row === index ? { ...line, productId: id, taxPercent: product?.tax_type === 'UNOFFICIAL' ? '0' : line.taxPercent || '0' } : line)
      const line = next[index]
      const complete = line?.productId && /^\d+(\.\d{1,3})?$/.test(String(line.quantity)) && Number(line.quantity) > 0 && line.unitPrice !== '' && Number.isSafeInteger(Number(line.unitPrice))
      if (index === next.length - 1 && complete && next.length < 100) next.push(emptyLine())
      return next
    })
  }
  const selectOrder = (id, order) => {
    setOrderId(id)
    setSelectedOrder(order)
    const matching = order || orders.find((item) => item.id === id)
    const orderLines = matching?.items || []
    if (matching) { setCurrency(matching.currency || 'IRR'); setExchangeRate(String(matching.exchange_rate || '1')); setDueDate(matching.due_date || '') }
    for (const item of orderLines) if (item.product) setSelectedProducts((current) => current.some((product) => product.id === item.product.id) ? current : [...current, item.product])
    if (matching) {
      setPartnerId(matching.partner_id)
      setSelectedPartner({ id: matching.partner_id, code: '', name: matching.partner_name })
      setLines(orderLines.length ? [...orderLines.map((item) => ({ productId: item.product_id, quantity: String(item.quantity), unitPrice: String(item.transaction_amounts?.unit_price ?? item.unit_price), discountAmount: String(item.transaction_amounts?.discount_amount ?? item.discount_amount ?? 0), discountPercent: String(item.discount_percent || 0), taxPercent: item.product?.tax_type === 'UNOFFICIAL' ? '0' : '0' })), ...(orderLines.length < 100 ? [emptyLine()] : [])] : [emptyLine()])
    } else {
      setPartnerId('')
      setSelectedPartner(null)
      setCurrency('IRR'); setExchangeRate('1'); setDueDate('')
      setLines([emptyLine()])
    }
  }
  const submit = (event) => {
    event.preventDefault()
    if (!partnerId) return setError('مشتری را انتخاب کنید.')
    if (!warehouseId) return setError('انبار مقصد را انتخاب کنید.')
    if (currency !== 'IRR' && !/^[1-9][0-9]{0,17}$/.test(String(exchangeRate))) return setError('نرخ تبدیل هر واحد ارز به ریال را وارد کنید.')
    const submittedLines = lines.filter((line) => line.productId)
    if (!submittedLines.length || submittedLines.some((line) => {
      const index = lines.indexOf(line)
      const product = productOptions.find((item) => item.id === line.productId)
      return !/^\d+(\.\d{1,3})?$/.test(String(line.quantity)) || !(Number(line.quantity) > 0) || Number(line.quantity) > 999999999999.999 || line.unitPrice === '' || !Number.isSafeInteger(Number(line.unitPrice)) || Number(line.unitPrice) < 0 || parsePercent(line.discountPercent || '0') === null || parsePercent(line.taxPercent || '0') === null || !/^\d*$/.test(String(line.discountAmount || '')) || calculation.rows[index].discount > calculation.rows[index].gross || (product?.tax_type === 'UNOFFICIAL' && Number(line.taxPercent || 0) > 0)
    })) return setError('مقدار، قیمت، تخفیف و مالیات هر ردیف را بررسی کنید؛ تخفیف از مبلغ ردیف بیشتر نباشد و برای کالای غیررسمی مالیات ثبت نشود.')
    if (new Set(submittedLines.map((line) => line.productId)).size !== submittedLines.length) return setError('هر کالا را فقط یک‌بار به فاکتور اضافه کنید.')
    if (parsePercent(discountPercent) === null || !/^\d*$/.test(String(discountAmount || '')) || !/^\d*$/.test(String(freightAmount || '')) || calculation.invoiceDiscount > calculation.lineNet) return setError('تخفیف کلی، هزینهٔ حمل و مبلغ رُندکردن را بررسی کنید؛ تخفیف کلی نمی‌تواند از جمع خالص ردیف‌ها بیشتر باشد.')
    if (BigInt(freightAmount || 0) > 0n && calculation.lineNet === 0n) return setError('برای سرشکن‌کردن هزینهٔ حمل، جمع خالص ردیف‌ها باید بیشتر از صفر باشد.')
    if (total <= 0n || total > 999999999999999999n) return setError('مبلغ نهایی فاکتور باید بیشتر از صفر و در سقف مجاز باشد.')
    const payload = { partnerId, warehouseId, ...(orderId ? { orderId } : {}), currency, exchangeRate: currency === 'IRR' ? '1' : String(exchangeRate), dueDate: dueDate || null, salesRepresentativeId: salesRepresentativeId || null, discountPercent: Number(discountPercent || 0), discountAmount: Number(discountAmount || 0), freightAmount: Number(freightAmount || 0), roundingUnit: Number(roundingUnit), roundingMethod, items: submittedLines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice), discountPercent: Number(line.discountPercent || 0), discountAmount: Number(line.discountAmount || 0), taxPercent: Number(line.taxPercent || 0) })), note: note.trim() || null }
    setError('')
    onSubmit(payload)
  }
  const loading = partnersQuery.isLoading || productsQuery.isLoading || warehousesQuery.isLoading || ordersQuery.isLoading
  const failed = partnersQuery.isError || productsQuery.isError || warehousesQuery.isError || ordersQuery.isError
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card purchase-order-modal"><div className="modal-heading"><div><span className="eyebrow">{initial ? 'ویرایش فاکتور در انتظار تأیید' : 'فاکتور جدید'}</span><h2>{initial ? initial.document_no : 'ثبت فاکتور فروش'}</h2></div><button className="icon-button" type="button" aria-label="بستن" onClick={onClose}><FiX/></button></div>
    <form className="modal-form sales-invoice-form" onSubmit={submit}>
      <label className="form-field sales-invoice-related-order"><span>سفارش فروش مرتبط (اختیاری)</span><SearchableSelect name="purchase-invoice-order" value={orderId} options={orderOptions} onChange={selectOrder} onSearch={setOrderSearch} loading={ordersQuery.isFetching} getOptionLabel={(order) => `${order.document_no} — ${order.partner_name}`} placeholder="شماره سفارش یا مشتری را جست‌وجو کنید" emptyLabel="سفارش بازی پیدا نشد"/></label>
      <label className="form-field"><span>مشتری *</span><SearchableSelect name="purchase-invoice-partner" value={partnerId} options={partnerOptions} onChange={(id, partner) => { setPartnerId(id); setSelectedPartner(partner); if (orderId && selectedOrder?.partner_id !== id) { setOrderId(''); setSelectedOrder(null) } }} onSearch={setPartnerSearch} loading={partnersQuery.isFetching} getOptionLabel={(partner) => `${partner.name}${partner.code ? ` (${partner.code})` : ''}`} placeholder="نام یا کد مشتری را جست‌وجو کنید" emptyLabel="مشتری‌ای پیدا نشد"/></label>
      <label className="form-field"><span>ویزیتور (اختیاری)</span><SearchableSelect name="sales-invoice-representative" value={salesRepresentativeId} options={salesRepresentativeOptions} onChange={(id, representative) => { setSalesRepresentativeId(id); setSelectedSalesRepresentative(representative) }} onSearch={() => {}} loading={salesRepresentativesQuery.isFetching} getOptionLabel={(representative) => `${representative.name}${representative.phone ? ` (${representative.phone})` : ''}`} placeholder="نام ویزیتور را جست‌وجو کنید" emptyLabel="ویزیتور فعالی پیدا نشد"/></label>
      <label className="form-field"><span>انبار مقصد *</span><SearchableSelect className="form-control" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="">انتخاب انبار</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}</SearchableSelect></label>
      <div className="purchase-order-full purchase-invoice-adjustments"><CommercialCurrencyFields lockCurrency={Boolean(orderId)} currency={currency} setCurrency={setCurrency} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate} dueDate={dueDate} setDueDate={setDueDate}/></div>
      <div className="purchase-order-lines purchase-order-full"><div className="purchase-order-lines-head"><strong>اقلام فاکتور</strong><span className="purchase-order-auto-hint">با تکمیل مقدار و قیمت، ردیف بعدی خودکار آماده می‌شود.</span></div><PurchaseLinesEditor currency={currency} lines={lines} products={productOptions} loading={productsQuery.isFetching} onSearch={setProductSearch} onSelectProduct={selectProduct} onChange={setLine} onRemove={(index) => setLines((current) => current.filter((_, row) => row !== index))} withTax calculatedRows={calculation.rows} compact/></div>
      <div className="purchase-invoice-adjustments purchase-order-full">
        <label className="form-field"><span>تخفیف کلی درصدی</span><div className="purchase-line-percent"><FormattedNumberInput className="form-control" decimalScale={4} grouping={false} value={discountPercent} onValueChange={setDiscountPercent}/><span>%</span></div></label>
        <label className="form-field"><span>تخفیف کلی مبلغی ({currency==='IRR'?'ریال':currency})</span><FormattedNumberInput className="form-control" decimalScale={0} value={discountAmount} onValueChange={setDiscountAmount}/></label>
        <label className="form-field"><span>هزینهٔ حمل ({currency==='IRR'?'ریال':currency})</span><FormattedNumberInput className="form-control" decimalScale={0} value={freightAmount} onValueChange={setFreightAmount}/><small>در بهای موجودی بر اساس ارزش خالص ردیف‌ها سرشکن می‌شود.</small></label>
        <label className="form-field"><span>واحد رُندکردن ({currency==='IRR'?'ریال':currency})</span><SearchableSelect className="form-control" value={roundingUnit} onChange={(event) => setRoundingUnit(event.target.value)}><option value="1">بدون رُندکردن</option><option value="10">۱۰ {currency==='IRR'?'ریال':currency}</option><option value="100">۱۰۰ {currency==='IRR'?'ریال':currency}</option><option value="1000">۱٬۰۰۰ {currency==='IRR'?'ریال':currency}</option><option value="10000">۱۰٬۰۰۰ {currency==='IRR'?'ریال':currency}</option></SearchableSelect></label>
        <label className="form-field"><span>روش رُندکردن</span><SearchableSelect className="form-control" value={roundingMethod} onChange={(event) => setRoundingMethod(event.target.value)}><option value="NEAREST">نزدیک‌ترین مبلغ</option><option value="UP">رو به بالا</option><option value="DOWN">رو به پایین</option></SearchableSelect></label>
      </div>
      <label className="form-field purchase-order-full"><span>یادداشت</span><textarea className="form-control" rows="2" value={note} onChange={(event) => setNote(event.target.value)}/></label>
      <div className="purchase-invoice-summary purchase-order-full"><div><span>جمع ناخالص کالاها</span><strong>{formatCurrency(calculation.subtotal,currency)}</strong></div><div><span>تخفیف ردیف‌ها</span><strong>− {formatCurrency(calculation.lineDiscount,currency)}</strong></div><div><span>تخفیف کلی</span><strong>− {formatCurrency(calculation.invoiceDiscount,currency)}</strong></div><div><span>مالیات فروش</span><strong>{formatCurrency(calculation.tax,currency)}</strong></div><div><span>هزینهٔ حمل</span><strong>{formatCurrency(calculation.freight,currency)}</strong></div><div><span>اصلاح رُندکردن</span><strong>{calculation.rounding < 0n ? '− ' : '+ '}{formatCurrency(calculation.rounding < 0n ? -calculation.rounding : calculation.rounding,currency)}</strong></div><div className="purchase-invoice-grand-total"><span>مبلغ نهایی فاکتور</span><strong>{formatCurrency(total,currency)}{currency!=='IRR'&&` · ${formatCurrency(total*BigInt(exchangeRate||0),'IRR')} معادل`}</strong></div></div>
      {error && <small className="purchase-order-error purchase-order-full">{error}</small>}
      {failed && <small className="purchase-order-error purchase-order-full">دریافت فهرست مشتریان، کالاها، انبارها یا سفارش‌ها انجام نشد. صفحه را ببندید و دوباره تلاش کنید.</small>}
      <div className="modal-actions purchase-order-full"><button type="button" className="btn btn-secondary" onClick={onClose}>انصراف</button><button className="btn btn-primary" disabled={busy || loading || failed || !partnerOptions.length || !productOptions.length || !warehouses.length}>{busy ? <span className="spinner"/> : initial ? <FiEdit2/> : <FiPlus/>} {initial ? 'ذخیرهٔ تغییرات' : 'ثبت فاکتور'}</button></div>
    </form>
  </section></div>
}

function InvoiceDetails({ invoice, onClose, onApprove, onReject, canApprove, canSettle, busy }) {
  const items = invoice.items || []
  const allocatedDocumentDiscount = items.reduce((sum, item) => sum + BigInt(item.document_discount_amount || 0), 0n)
  const date = invoice.created_at ? formatPersianDate(invoice.created_at, true) : '—'
  const partnerName = invoice.partner_name || invoice.partner?.name || '—'
  const invoiceStatus = statuses[invoice.status] || invoice.status
  const rounding = BigInt(invoice.rounding_amount || 0)
  const partner = invoice.partner || {}
  const vendorDetails = [["نام مشتری", partnerName], ["کد طرف حساب", partner.code], ["شماره تماس", partner.phone || partner.mobile], ["شناسه ملی", partner.national_id], ["شناسه اقتصادی", partner.economic_code], ["نشانی", partner.address], ["انبار", invoice.warehouse?.name], ["ویزیتور", invoice.salesRepresentative?.name], ["سفارش مرتبط", invoice.orderDocument?.document_no]].filter(([, value]) => value)
  const printRows = items.map((item, index) => ({ key: item.product_id, cells: [new Intl.NumberFormat('fa-IR').format(index + 1), item.product?.code || '—', item.product?.name || item.product_id, quantity(item.quantity), item.product?.unit || '—', amount(item.unit_price), amount(item.discount_amount), `${new Intl.NumberFormat('fa-IR').format(Number(item.discount_percent || 0))}٪`, `${new Intl.NumberFormat('fa-IR').format(Number(item.tax_percent || 0))}٪ · ${amount(item.tax_amount)}`, amount(item.line_total)] }))
  const totalDiscount = BigInt(invoice.line_discount_amount || 0) + allocatedDocumentDiscount
  const printSummary = [["مبلغ ناخالص فاکتور", amount(invoice.subtotal_amount)], ["جمع تخفیفات", `− ${amount(totalDiscount)}`], ["هزینه‌ها (حمل)", amount(invoice.freight_amount)], ["مالیات", amount(invoice.tax_amount)], ...(rounding !== 0n ? [["اصلاح رُندکردن", `${rounding < 0n ? '− ' : '+ '}${amount(rounding < 0n ? -rounding : rounding)}`]] : []), ["جمع خالص قابل پرداخت", amount(invoice.total_amount), true]]
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card purchase-order-modal"><div className="modal-heading"><div><span className="eyebrow">جزئیات فاکتور فروش</span><h2>{invoice.document_no}</h2></div><div className="purchase-detail-actions"><button type="button" className="btn btn-secondary" onClick={() => window.print()}><FiPrinter/> چاپ</button><button className="icon-button" aria-label="بستن" onClick={onClose}><FiX/></button></div></div><div className="order-detail-meta"><span>مشتری: <strong>{partnerName}</strong></span><span>انبار: <strong>{invoice.warehouse?.name || '—'}</strong></span><span>سفارش مرتبط: <strong>{invoice.orderDocument?.document_no || '—'}</strong></span><span>ویزیتور: <strong>{invoice.salesRepresentative?.name || '—'}</strong></span><span>وضعیت: <strong>{invoiceStatus}</strong></span>{invoice.note && <span>یادداشت: <strong>{invoice.note}</strong></span>}{invoice.rejection_reason && <span>دلیل رد: <strong>{invoice.rejection_reason}</strong></span>}</div><CommercialSettlementsPanel invoice={invoice} documentType="SALES_INVOICE" canSettle={canSettle}/><div className="table-scroll"><table className="data-table"><thead><tr><th>ردیف</th><th>کد کالا</th><th>نام کالا</th><th>مقدار</th><th>واحد</th><th>مبلغ واحد</th><th>تخفیف مبلغی</th><th>تخفیف درصدی</th><th>مالیات</th><th>جمع کل سطر</th></tr></thead><tbody>{items.map((item,index) => <tr key={item.product_id}><td>{new Intl.NumberFormat('fa-IR').format(index+1)}</td><td>{item.product?.code || '—'}</td><td>{item.product?.name || item.product_id}</td><td>{quantity(item.quantity)}</td><td>{item.product?.unit || '—'}</td><td>{amount(item.unit_price)}</td><td>{amount(item.discount_amount)}</td><td>{new Intl.NumberFormat('fa-IR').format(Number(item.discount_percent||0))}٪</td><td>{new Intl.NumberFormat('fa-IR').format(Number(item.tax_percent||0))}٪ · {amount(item.tax_amount)}</td><td>{amount(item.line_total)}</td></tr>)}</tbody><tfoot><tr><th colSpan="9">جمع ناخالص کالاها</th><th>{amount(invoice.subtotal_amount)}</th></tr><tr><th colSpan="9">تخفیف ردیف‌ها</th><th>− {amount(invoice.line_discount_amount)}</th></tr><tr><th colSpan="9">تخفیف کلی</th><th>− {amount(allocatedDocumentDiscount)}</th></tr><tr><th colSpan="9">مالیات فروش</th><th>{amount(invoice.tax_amount)}</th></tr><tr><th colSpan="9">هزینهٔ حمل</th><th>{amount(invoice.freight_amount)}</th></tr><tr><th colSpan="9">اصلاح رُندکردن</th><th>{rounding < 0n ? '− ' : '+ '}{amount(rounding < 0n ? -rounding : rounding)}</th></tr><tr><th colSpan="9">مبلغ نهایی فاکتور</th><th>{amount(invoice.total_amount)}</th></tr></tfoot></table></div>{canApprove && invoice.status === 'PENDING_APPROVAL' && <div className="modal-actions"><button className="btn btn-secondary" disabled={busy} onClick={onReject}><FiSlash/> رد فاکتور</button><button className="btn btn-primary" disabled={busy} onClick={onApprove}><FiCheck/> تأیید و ثبت موجودی</button></div>}</section><PurchasePrintSheet title="فاکتور فروش" templateType="فروش" documentNo={invoice.document_no} date={date} dueDate={invoice.due_date} description={invoice.note} detailsTitle="مشخصات مشتری" details={vendorDetails} columns={["ردیف", "کد کالا", "نام کالا", "مقدار", "واحد", "مبلغ واحد", "تخفیف مبلغی", "تخفیف درصدی", "مالیات", "جمع کل سطر"]} rows={printRows} summary={printSummary} note={invoice.note}/></div>
}
