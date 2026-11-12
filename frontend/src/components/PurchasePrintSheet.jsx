import { createPortal } from 'react-dom'
import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../services/api'
import { formatPersianDate } from '../utils/persianDate'

const getDetail = (details, matcher) => details.find(([label]) => matcher.test(label))?.[1] || ''
const bindColumn = binding => ({ 'items.name': /نام کالا|شرح کالا|شرح خدمت/, 'items.quantity': /مقدار|تعداد/, 'items.unit': /واحد/, 'items.unitPrice': /مبلغ واحد|قیمت واحد/, 'items.amount': /جمع کل سطر|مبلغ ردیف|مبلغ$/, 'items.tax': /مالیات/ })[binding]
function TemplateElement({ element, title, documentNo, date, dueDate, description, details, columns, rows, summary, note, company, logoSrc, stampSrc }) {
  const bindings = {
    'invoice.number': documentNo, 'invoice.date': date, 'invoice.dueDate': dueDate ? formatPersianDate(String(dueDate).slice(0, 10)) : '', 'invoice.description': description || note || '',
    'partner.name': getDetail(details, /نام (مشتری|تأمین‌کننده|طرف)/),
    'partner.nationalId': getDetail(details, /شناسه|کد ملی/), 'partner.phone': getDetail(details, /تلفن|موبایل/), 'partner.address': getDetail(details, /نشانی|آدرس/),
    'company.name': company?.displayName || company?.legalName || '', 'company.nationalId': company?.nationalId || '', 'company.economicNumber': company?.economicNumber || '',
    'company.phone': company?.phoneNumbers?.map(item => item.number).filter(Boolean).join('، ') || '', 'company.website': company?.website || '',
    'totals.subtotal': summary.find(([label]) => /ناخالص|قبل از مالیات/.test(label))?.[1], 'totals.tax': summary.find(([label]) => /مالیات/.test(label))?.[1],
    'totals.discount': summary.find(([label]) => /تخفیف/.test(label))?.[1], 'totals.final': summary.find(([, , total]) => total)?.[1] || summary.at(-1)?.[1], 'totals.inWords': '',
  }
  const base = { position: 'absolute', right: `${element.x ?? 0}%`, top: `${element.y ?? 0}%`, width: `${element.w ?? 30}%`, minHeight: element.type === 'divider' ? '1px' : `${element.h ?? 3}%`, fontFamily: element.fontFamily || 'Vazirmatn', fontSize: `${element.fontSize || 10}pt`, fontWeight: element.bold ? 700 : 400, textAlign: element.align || 'right', color: element.color || '#27364a', background: element.background && element.background !== 'transparent' ? element.background : 'transparent', border: Number(element.borderWidth) ? `${element.borderWidth}px solid ${element.borderColor || '#cbd5e1'}` : '0', borderRadius: `${element.radius || 0}px`, boxShadow: element.shadow ? '0 2px 8px rgba(0,0,0,.12)' : 'none', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '2px 4px' }
  let content = element.value || ''
  if (element.type === 'field') {
    const value = element.binding ? bindings[element.binding] : ''
    content = value ? `${element.label || ''}${element.label ? ': ' : ''}${value}` : ''
  } else if (element.type === 'title') content = element.value || title
  else if (element.type === 'totals') content = summary.map(([label, value]) => `${label}: ${value}`).join('\n') || element.value || ''
  else if (element.type === 'company') content = element.value || ''
  else if (element.type === 'logo') content = element.value || 'لوگو'
  else if (element.type === 'stamp') content = element.value || 'مهر شرکت'
  else if (element.type === 'signature') content = element.value || 'امضا'
  if (element.type === 'divider') return <div key={element.id} className="template-print-element" style={{ ...base, height: `${element.borderWidth || 1}px`, minHeight: 0, background: element.borderColor || element.color || '#cbd5e1', padding: 0, '--template-color': element.color || '#27364a', '--template-shadow': 'none' }} />
  if (element.type === 'table') {
    const customColumns = element.columns?.length ? element.columns : columns.map((label, index) => ({ id: String(index), label, index }))
    const indexes = customColumns.map(column => {
      if (Number.isInteger(column.index)) return column.index
      const candidates = bindColumn(column.binding)
      const match = candidates ? columns.findIndex(label => candidates.test(label)) : -1
      return match >= 0 ? match : columns.indexOf(column.label)
    })
    return <div key={element.id} className="template-print-element" style={{ ...base, minHeight: 0, padding: 0, '--template-color': element.color || '#27364a', '--template-shadow': element.shadow ? '0 2px 8px rgba(0,0,0,.12)' : 'none' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${element.fontSize || 9}pt` }}><thead><tr>{customColumns.map(column => <th key={column.id} style={{ border: `1px solid ${element.borderColor || '#cbd5e1'}`, background: element.background || '#eef2f6', padding: 4, textAlign: element.align || 'right' }}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={row.key ?? rowIndex}>{customColumns.map((column, columnIndex) => <td key={column.id} style={{ border: `1px solid ${element.borderColor || '#cbd5e1'}`, padding: 4, textAlign: element.align || 'right' }}>{indexes[columnIndex] >= 0 ? row.cells?.[indexes[columnIndex]] ?? '' : ''}</td>)}</tr>)}</tbody></table></div>
  }
  if (element.type === 'company') content = [company?.displayName || company?.legalName, company?.nationalId && `شناسه ملی: ${company.nationalId}`, company?.phoneNumbers?.length && `تلفن: ${company.phoneNumbers.map(item => item.number).filter(Boolean).join('، ')}`, company?.website].filter(Boolean).join('\n')
  if (element.type === 'logo' && logoSrc) return <div key={element.id} className="template-print-element" style={{ ...base, '--template-color': element.color || '#27364a', '--template-shadow': element.shadow ? '0 2px 8px rgba(0,0,0,.12)' : 'none' }}><img src={logoSrc} alt="لوگوی شرکت" style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }}/></div>
  if (element.type === 'stamp' && stampSrc) return <div key={element.id} className="template-print-element" style={{ ...base, '--template-color': element.color || '#27364a', '--template-shadow': element.shadow ? '0 2px 8px rgba(0,0,0,.12)' : 'none' }}><img src={stampSrc} alt="مهر شرکت" style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }}/></div>
  return <div key={element.id} className="template-print-element" style={{ ...base, '--template-color': element.color || '#27364a', '--template-shadow': element.shadow ? '0 2px 8px rgba(0,0,0,.12)' : 'none' }}>{content}</div>
}

export default function PurchasePrintSheet({ title, documentNo, date, dueDate, description, templateType = 'پیش‌فاکتور', detailsTitle = 'مشخصات طرف حساب', details = [], columns = [], rows = [], summary = [], note }) {
  const settings = useQuery({ queryKey: ['settings-print-default', templateType], queryFn: async () => unwrap(await api.get(`/settings/print/default/${encodeURIComponent(templateType)}`)), retry: false })
  const printOptions = settings.data?.printOptions || {}
  const pageMargin = printOptions.margins === 'compact' ? '5mm' : printOptions.margins === 'wide' ? '18mm' : '10mm'
  const template = settings.data?.template
  const companyNeeded = template?.elements?.some(item => ['company', 'logo', 'stamp'].includes(item.type) || String(item.binding || '').startsWith('company.'))
  const companyQuery = useQuery({ queryKey: ['company-print-identity'], queryFn: async () => unwrap(await api.get('/settings/general')), enabled: Boolean(companyNeeded), retry: false })
  const logoQuery = useQuery({ queryKey: ['company-print-logo'], queryFn: async () => (await api.get('/settings/general/media/logo', { responseType: 'blob' })).data, enabled: Boolean(companyQuery.data?.logoPath && template?.elements?.some(item => item.type === 'logo')), retry: false })
  const stampQuery = useQuery({ queryKey: ['company-print-stamp'], queryFn: async () => (await api.get('/settings/general/media/stamp', { responseType: 'blob' })).data, enabled: Boolean(companyQuery.data?.stampPath && template?.elements?.some(item => item.type === 'stamp')), retry: false })
  const logoSrc = useMemo(() => logoQuery.data ? URL.createObjectURL(logoQuery.data) : '', [logoQuery.data])
  const stampSrc = useMemo(() => stampQuery.data ? URL.createObjectURL(stampQuery.data) : '', [stampQuery.data])
  useEffect(() => () => { if (logoSrc) URL.revokeObjectURL(logoSrc); if (stampSrc) URL.revokeObjectURL(stampSrc) }, [logoSrc, stampSrc])
  if (template?.elements?.length) {
    const isThermal = template.size === '۸۰ میلی‌متر' || template.size === 'thermal'
    const pageSize = isThermal ? '80mm 180mm' : template.size === 'A5' ? (template.orientation === 'landscape' ? '210mm 148mm' : '148mm 210mm') : (template.orientation === 'landscape' ? '297mm 210mm' : '210mm 297mm')
    const elements = template.elements
    const pageHeight = isThermal ? 'auto' : pageSize.split(' ')[1]
    return createPortal(<><style>{`@page{size:${pageSize};margin:${isThermal?'2mm':pageMargin}}@media print{.purchase-print-sheet-custom{${isThermal?'min-height:180mm;':''}height:${pageHeight}!important;min-height:${pageHeight}!important;position:relative!important;overflow:visible!important}.purchase-print-sheet-custom .template-print-element{color:var(--template-color)!important;box-shadow:var(--template-shadow)!important}.purchase-print-sheet-custom .template-print-element *{color:inherit!important;box-shadow:inherit!important}}`}</style><article className="purchase-print-sheet purchase-print-sheet-custom" dir="rtl" style={{ width: pageSize.split(' ')[0], height: pageHeight, background: template.background || '#fff', position: 'relative' }}>
      {elements.map(element => <TemplateElement key={element.id} element={element} title={title} documentNo={documentNo} date={date} dueDate={dueDate} description={description} details={details} columns={columns} rows={rows} summary={summary} note={note} company={companyQuery.data} logoSrc={logoSrc} stampSrc={stampSrc}/>)}
    </article></>, document.body)
  }
  const paper = printOptions.paper === 'A5' ? 'A5' : printOptions.paper === 'thermal' ? '80mm auto' : 'A4'
  const orientation = paper === '80mm auto' ? '' : printOptions.orientation === 'landscape' ? ' landscape' : ' portrait'
  return createPortal(<><style>{`@media print{@page{size:${paper}${orientation};margin:${paper === '80mm auto' ? '2mm' : pageMargin}}}`}</style><article className="purchase-print-sheet" dir="rtl">
    <header className="purchase-print-header">
      <div className="purchase-print-brand">راهکار | سیستم ERP</div>
      <h1>{title}</h1>
      <div className="purchase-print-doc-meta"><div><span>شماره:</span><strong>{documentNo || '—'}</strong></div><div><span>تاریخ:</span><strong>{date || '—'}</strong></div></div>
    </header>
    <section className="purchase-print-vendor">
      <h2>{detailsTitle}</h2>
      {details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}
    </section>
    <table className="purchase-print-table">
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.key ?? index}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}>{cell ?? '—'}</td>)}</tr>)}</tbody>
    </table>
    {summary.length > 0 && <section className="purchase-print-summary">{summary.map(([label, value, total]) => <div className={total ? 'is-total' : ''} key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>}
    {note && <p className="purchase-print-note"><strong>یادداشت:</strong> {note}</p>}
  </article></>, document.body)
}
