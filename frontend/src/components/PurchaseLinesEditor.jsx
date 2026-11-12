import { FiTrash2 } from 'react-icons/fi'
import SearchableSelect from './SearchableSelect'
import FormattedNumberInput from './FormattedNumberInput'
import { calculatePurchaseOrderLine, formatCurrency } from '../utils/purchaseAmounts'

export default function PurchaseLinesEditor({ lines, products, loading, onSearch, onSelectProduct, onChange, onRemove, withTax = false, calculatedRows = [], getProductLabel, compact = false, currency = 'IRR' }) {
  const moneyUnit = currency === 'IRR' ? 'ریال' : currency
  const columns = [
    ['#', 'ردیف'], ['code', 'کد کالا'], ['name', 'نام کالا'], ['quantity', 'مقدار'], ['unit', 'واحد اصلی'],
    ['price', `مبلغ واحد (${moneyUnit})`], ['discountAmount', `تخفیف مبلغی (${moneyUnit})`], ['discountPercent', 'تخفیف درصدی'],
    ...(withTax ? [['tax', 'مالیات (%)']] : []), ['total', `جمع کل سطر (${moneyUnit})`], ['remove', ''],
  ]
  return <div className="purchase-lines-scroll" dir="rtl">
    <div className={`purchase-lines-table ${withTax ? 'purchase-lines-with-tax' : ''} ${compact ? 'sales-invoice-lines' : ''}`}>
      <div className="purchase-lines-header">{columns.map(([key, label]) => <span key={key}>{label}</span>)}</div>
      {lines.map((line, index) => {
        const product = products.find((item) => String(item.id) === String(line.productId))
        const computed = calculatedRows[index] || calculatePurchaseOrderLine(line)
        const cell = (label, content, className = '') => compact ? <div className={`sales-invoice-line-cell ${className}`} data-label={label}>{content}</div> : content
        return <div className="purchase-line-row" key={index}>
          {cell('ردیف', <div className="purchase-line-index">{new Intl.NumberFormat('fa-IR').format(index + 1)}</div>, 'sales-invoice-cell-index')}
          {cell('کد کالا', <div className="purchase-line-code">{product?.code || '—'}</div>, 'sales-invoice-cell-code')}
          {cell('نام کالا', <SearchableSelect name={`purchase-line-product-${index}`} value={line.productId} options={products.filter((item) => item.id === line.productId || !lines.some((other, row) => row !== index && other.productId === item.id))} onChange={(id, selectedProduct) => onSelectProduct(index, id, selectedProduct)} onSearch={onSearch} loading={loading} getOptionLabel={getProductLabel || ((item) => item.name)} placeholder="جستجوی کالا یا کد" emptyLabel="کالایی پیدا نشد" className="purchase-line-name"/>, 'sales-invoice-cell-product')}
          {cell('مقدار', <FormattedNumberInput aria-label="مقدار" className="form-control" decimalScale={3} value={line.quantity} onValueChange={(value) => onChange(index, 'quantity', value)}/>, 'sales-invoice-cell-quantity')}
          {cell('واحد اصلی', <div className="purchase-line-unit">{product?.unit || '—'}</div>, 'sales-invoice-cell-unit')}
          {cell(`مبلغ واحد (${moneyUnit})`, <FormattedNumberInput aria-label={`مبلغ واحد به ${moneyUnit}`} className="form-control" decimalScale={0} value={line.unitPrice} onValueChange={(value) => onChange(index, 'unitPrice', value)}/>, 'sales-invoice-cell-price')}
          {cell(`تخفیف مبلغی (${moneyUnit})`, <FormattedNumberInput aria-label={`تخفیف مبلغی به ${moneyUnit}`} className="form-control" decimalScale={0} value={line.discountAmount || ''} onValueChange={(value) => onChange(index, 'discountAmount', value)}/>, 'sales-invoice-cell-discount-amount')}
          {cell('درصد تخفیف', <div className="purchase-line-percent"><FormattedNumberInput aria-label="درصد تخفیف" className="form-control" decimalScale={4} grouping={false} value={line.discountPercent ?? '0'} onValueChange={(value) => onChange(index, 'discountPercent', value)}/><span>%</span></div>, 'sales-invoice-cell-discount-percent')}
          {withTax && cell('مالیات', <div className="purchase-line-tax"><div className="purchase-line-percent"><FormattedNumberInput aria-label="درصد مالیات" className="form-control" decimalScale={4} grouping={false} disabled={product?.tax_type === 'UNOFFICIAL'} value={product?.tax_type === 'UNOFFICIAL' ? '0' : line.taxPercent ?? '0'} onValueChange={(value) => onChange(index, 'taxPercent', value)}/><span>%</span></div></div>, 'sales-invoice-cell-tax')}
          {cell('جمع کل سطر', <strong className="purchase-line-total">{formatCurrency(computed.total || 0n, currency)}</strong>, 'sales-invoice-cell-total')}
          {cell('', <button className="icon-button purchase-line-remove" type="button" aria-label={`حذف ردیف ${index + 1}`} title="حذف ردیف" disabled={lines.length === 1} onClick={() => onRemove(index)}><FiTrash2/></button>, 'sales-invoice-cell-remove')}
        </div>
      })}
    </div>
  </div>
}
