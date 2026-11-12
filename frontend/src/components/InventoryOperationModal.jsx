import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import SearchableSelect from './SearchableSelect'
import { api, getErrorMessage, unwrap } from '../services/api'
import { fetchAllPages } from '../utils/fetchAllPages'

export default function InventoryOperationModal({ type, onClose }) {
  const isTransfer = type === 'transfers'
  const qc = useQueryClient()
  const [warehouseId, setWarehouseId] = useState('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState('')
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState([{ productId: '', quantity: '' }])
  const [error, setError] = useState('')
  const warehousesQuery = useQuery({ queryKey: ['inventory-operation-warehouses'], queryFn: () => fetchAllPages('/inventory/warehouses?is_active=1') })
  const productsQuery = useQuery({ queryKey: ['inventory-operation-products'], queryFn: () => fetchAllPages('/products?is_active=1') })
  const warehouses = warehousesQuery.data || []
  const products = productsQuery.data || []
  const productOptions = useMemo(() => products.map(product => ({ id: product.id, label: `${product.code || '—'} · ${product.name}` })), [products])
  const [busy, setBusy] = useState(false)
  const submit = async event => {
    event.preventDefault()
    setError('')
    const items = lines.filter(line => line.productId).map(line => ({ productId: line.productId, ...(isTransfer ? { quantity: line.quantity } : { countedQuantity: line.quantity }) }))
    if (isTransfer && (!sourceWarehouseId || !destinationWarehouseId)) return setError('انبار مبدأ و مقصد را انتخاب کنید.')
    if (!isTransfer && !warehouseId) return setError('انبار شمارش را انتخاب کنید.')
    if (isTransfer && sourceWarehouseId === destinationWarehouseId) return setError('انبار مبدأ و مقصد باید متفاوت باشند.')
    if (!items.length || items.some(item => !/^(\d+)(\.\d{1,3})?$/.test(String(isTransfer ? item.quantity : item.countedQuantity)))) return setError('برای هر ردیف، کالا و مقدار معتبر تا سه رقم اعشار وارد کنید.')
    if (new Set(items.map(item => item.productId)).size !== items.length) return setError('هر کالا را فقط یک‌بار در فهرست وارد کنید.')
    const message = isTransfer
      ? 'با ثبت انتقال، موجودی دو انبار بلافاصله تغییر می‌کند. ادامه می‌دهید؟'
      : 'ثبت شمارش ممکن است طبق تنظیمات سامانه اختلاف را بلافاصله در موجودی اعمال کند. ادامه می‌دهید؟'
    if (!window.confirm(message)) return
    setBusy(true)
    try {
      await api.post(isTransfer ? '/inventory/transfers' : '/inventory/counts', isTransfer
        ? { sourceWarehouseId, destinationWarehouseId, items, reference: reference.trim() || null, note: note.trim() || null }
        : { warehouseId, items, reference: reference.trim() || null, note: note.trim() || null })
      toast.success(isTransfer ? 'انتقال کالا ثبت شد' : 'شمارش موجودی ثبت شد')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['resource', '/inventory/transfers'] }),
        qc.invalidateQueries({ queryKey: ['resource', '/inventory/counts'] }),
        qc.invalidateQueries({ queryKey: ['resource', '/inventory/stock'] }),
        qc.invalidateQueries({ queryKey: ['resource', '/inventory/movements'] }),
      ])
      onClose()
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally { setBusy(false) }
  }
  const setLine = (index, key, value) => setLines(current => current.map((line, row) => row === index ? { ...line, [key]: value } : line))
  const whOptions = warehouses.map(warehouse => ({ id: warehouse.id, label: `${warehouse.name} · ${warehouse.code}` }))
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !busy && onClose()}>
    <section className="modal-card inventory-operation-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-operation-title">
      <div className="modal-heading"><div><span className="eyebrow">عملیات انبار</span><h2 id="inventory-operation-title">{isTransfer ? 'ثبت انتقال بین انبارها' : 'ثبت شمارش موجودی'}</h2></div><button type="button" className="icon-button" aria-label="بستن" disabled={busy} onClick={onClose}><FiX/></button></div>
      {(warehousesQuery.isError || productsQuery.isError) ? <div className="error-state"><strong>دریافت اطلاعات پایه انجام نشد</strong><span>{getErrorMessage(warehousesQuery.error || productsQuery.error)}</span></div> : <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          {isTransfer ? <>
            <label className="form-field"><span>انبار مبدأ *</span><SearchableSelect value={sourceWarehouseId} options={whOptions} onChange={setSourceWarehouseId} loading={warehousesQuery.isLoading} placeholder="جست‌وجو و انتخاب انبار"/></label>
            <label className="form-field"><span>انبار مقصد *</span><SearchableSelect value={destinationWarehouseId} options={whOptions} onChange={setDestinationWarehouseId} loading={warehousesQuery.isLoading} placeholder="جست‌وجو و انتخاب انبار"/></label>
          </> : <label className="form-field"><span>انبار شمارش *</span><SearchableSelect value={warehouseId} options={whOptions} onChange={setWarehouseId} loading={warehousesQuery.isLoading} placeholder="جست‌وجو و انتخاب انبار"/></label>}
          <label className="form-field"><span>شماره مرجع (اختیاری)</span><input className="form-control" value={reference} maxLength={100} onChange={event => setReference(event.target.value)}/></label>
        </div>
        <div className="purchase-order-lines"><div className="purchase-order-lines-head"><strong>{isTransfer ? 'اقلام انتقال' : 'اقلام شمارش'}</strong><button className="btn btn-secondary" type="button" disabled={lines.length >= 100} onClick={() => setLines(current => [...current, { productId: '', quantity: '' }])}><FiPlus/> افزودن ردیف</button></div>
          {lines.map((line, index) => <div className="inventory-operation-line" key={index}>
            <label className="form-field"><span>کالا *</span><SearchableSelect value={line.productId} options={productOptions.filter(option => !lines.some((other, otherIndex) => otherIndex !== index && other.productId === option.id))} onChange={value => setLine(index, 'productId', value)} loading={productsQuery.isLoading} placeholder="جست‌وجوی کالا یا کد"/></label>
            <label className="form-field"><span>{isTransfer ? 'مقدار انتقال *' : 'مقدار شمارش‌شده *'}</span><input className="form-control" type="number" min="0" step="0.001" value={line.quantity} onChange={event => setLine(index, 'quantity', event.target.value)}/></label>
            <button className="icon-button danger" type="button" aria-label={`حذف ردیف ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines(current => current.filter((_, row) => row !== index))}><FiTrash2/></button>
          </div>)}
        </div>
        <label className="form-field"><span>یادداشت (اختیاری)</span><textarea className="form-control" rows="3" value={note} onChange={event => setNote(event.target.value)}/></label>
        {error && <div className="purchase-order-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>انصراف</button><button type="submit" className="btn btn-primary" disabled={busy || warehousesQuery.isLoading || productsQuery.isLoading}>{busy ? 'در حال ثبت…' : isTransfer ? 'ثبت انتقال و به‌روزرسانی موجودی' : 'ثبت شمارش'}</button></div>
      </form>}
    </section>
  </div>
}
