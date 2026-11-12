import { useState } from 'react'
import { FiAlertCircle, FiCheck, FiDownload, FiUpload, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import { readXlsxWorkbook, saveXlsxSheets } from '../utils/exportDocuments'

const columns = [
  ['name', 'نام کالا', true, 'متن؛ حداکثر ۲۰۰ نویسه'],
  ['unit', 'واحد اصلی', false, 'مثال: عدد، کیلوگرم، متر؛ پیش‌فرض: عدد'],
  ['secondary_unit', 'واحد فرعی', false, 'اختیاری؛ همراه ضریب تبدیل وارد شود'],
  ['units_per_secondary', 'ضریب تبدیل', false, 'عدد صحیح مثبت؛ فقط همراه واحد فرعی'],
  ['weight_kg', 'وزن (کیلوگرم)', false, 'عدد صفر یا بزرگ‌تر، حداکثر سه رقم اعشار'],
  ['sale_price', 'قیمت فروش (ریال)', true, 'عدد صحیح صفر یا بزرگ‌تر'],
  ['tax_type', 'نوع مالیاتی', true, 'رسمی / مشمول مالیات یا غیررسمی / غیرمشمول مالیات'],
  ['barcode', 'بارکد', false, 'اختیاری؛ در سامانه باید یکتا باشد'],
  ['reorder_point', 'نقطه سفارش', false, 'عدد صفر یا بزرگ‌تر'],
  ['is_active', 'وضعیت', false, 'فعال یا غیرفعال؛ پیش‌فرض: فعال'],
  ['description', 'توضیحات', false, 'اختیاری'],
  ['categoryNames', 'دسته‌بندی‌ها', false, 'نام دسته‌های موجود، با ویرگول جدا شوند'],
]
const headerMap = new Map(columns.flatMap(([key, label]) => [[key.toLowerCase(), key], [label.replaceAll(' ', '').toLowerCase(), key]]))
const normalizeHeader = value => String(value || '').replace(/[\u200c\u200f\u200e\s]/g, '').toLowerCase()
const digits = value => String(value ?? '').replace(/[۰-۹٠-٩]/g, digit => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(digit) % 10))
const escapeCell = value => String(value ?? '')

export async function downloadProductImportGuide() {
  const guideRows = [['راهنمای ورود گروهی کالا'], ['نام ستون', 'ضروری', 'قواعد و نمونه'], ...columns.map(([, label, required, guideText]) => [label, required ? 'بله' : 'خیر', guideText]), ['نکته', '', 'کد کالا در سامانه به‌صورت خودکار ساخته می‌شود؛ ستون کد در فایل وارد نمی‌شود.'], ['نکته', '', 'نام دسته‌بندی باید عیناً با نام یک دسته‌بندی موجود در سامانه برابر باشد.'], ['نکته', '', 'اگر یک ردیف اشکال داشته باشد، فقط کالاهای سالم پس از تأیید شما ذخیره می‌شوند.']]
  await saveXlsxSheets([
    { name: 'کالاها', rows: [columns.map(([, label]) => label)], widths: columns.map(([, label]) => Math.max(18, label.length + 6)), autoFilter: true, headerStyle: true },
    { name: 'راهنما', rows: guideRows, widths: [28, 14, 82], rightToLeft: true },
  ], 'راهنمای-ورود-گروهی-کالا.xlsx')
}

export default function ProductExcelImport({ onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const parseFile = async selected => {
    setFile(selected); setPreview(null)
    if (!selected) return
    if (selected.size > 10 * 1024 * 1024) { toast.error('حجم فایل حداکثر ۱۰ مگابایت باشد'); setFile(null); return }
    if (!/\.xlsx$/i.test(selected.name)) { toast.error('فایل باید با الگوی سامانه و پسوند xlsx باشد'); setFile(null); return }
    try {
      const workbook = readXlsxWorkbook(await selected.arrayBuffer())
      const sheet = workbook.find(item => item.name === 'کالاها') || workbook[0]
      const matrix = sheet?.rows || []
      if (matrix.length < 2) throw new Error('فایل عنوان ستون یا ردیفی برای بررسی ندارد')
      const headerCells = matrix[0].map(normalizeHeader)
      const mapped = headerCells.map(header => headerMap.get(header) || null)
      if (!mapped.includes('name')) throw new Error('ستون «نام کالا» در فایل پیدا نشد؛ از الگوی راهنما استفاده کنید')
      const rows = matrix.slice(1).map((cells, index) => {
        const row = { rowNumber: index + 2 }
        mapped.forEach((key, columnIndex) => { if (key) row[key] = cells[columnIndex] ?? '' })
        for (const key of ['sale_price', 'units_per_secondary', 'weight_kg', 'reorder_point', 'is_active']) if (row[key] !== undefined) row[key] = digits(row[key]).replace(/[٬,\s]/g, '').trim()
        if (row.categoryNames !== undefined) row.categoryNames = escapeCell(row.categoryNames).split(/[,،;؛]/).map(item => item.trim()).filter(Boolean)
        return row
      }).filter(row => Object.entries(row).some(([key, value]) => key !== 'rowNumber' && (Array.isArray(value) ? value.length : String(value).trim())))
      if (!rows.length) throw new Error('هیچ ردیف کالایی در فایل پیدا نشد')
      if (rows.length > 1000) throw new Error('هر بار حداکثر ۱۰۰۰ کالا را وارد کنید')
      setBusy(true)
      const result = unwrap(await api.post('/products/import/preview', { rows }))
      setPreview(result)
    } catch (error) { toast.error(getErrorMessage(error) || 'خواندن فایل انجام نشد') }
    finally { setBusy(false) }
  }
  const confirmImport = async () => {
    if (!preview?.valid?.length) return
    setBusy(true)
    try {
      const result = unwrap(await api.post('/products/import', { rows: preview.valid.map(row => row.data) }))
      toast.success(`${new Intl.NumberFormat('fa-IR').format(result.createdCount)} کالا ذخیره شد`)
      onImported(); onClose()
    } catch (error) { toast.error(getErrorMessage(error)) }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !busy && onClose()}><section className="modal-card product-import-modal" role="dialog" aria-modal="true" aria-labelledby="product-import-title">
    <div className="modal-heading"><div><span className="eyebrow">مدیریت کالاها</span><h2 id="product-import-title">ورود گروهی کالا از Excel</h2></div><button type="button" className="icon-button" aria-label="بستن" disabled={busy} onClick={onClose}><FiX /></button></div>
    <div className="product-import-guide"><strong>راهنمای فایل</strong><p>نام کالا، قیمت فروش و نوع مالیاتی ضروری هستند. واحد فرعی فقط همراه ضریب تبدیل پذیرفته می‌شود. کد کالا خودکار ساخته می‌شود و دسته‌بندی باید از قبل در سامانه وجود داشته باشد.</p><button type="button" className="btn btn-secondary" onClick={downloadProductImportGuide}><FiDownload /> دریافت الگوی Excel و راهنما</button></div>
    <label className="product-import-file"><FiUpload /><span>{file?.name || 'فایل Excel را انتخاب کنید'}</span><input type="file" accept=".xlsx" onChange={event => parseFile(event.target.files?.[0])} disabled={busy} /></label>
    {busy && <div className="loading-line" />}
    {preview && <div className="product-import-results"><div className="product-import-counts"><span><FiCheck /> سالم برای ثبت: <b>{new Intl.NumberFormat('fa-IR').format(preview.valid.length)}</b></span><span><FiAlertCircle /> مشکل‌دار: <b>{new Intl.NumberFormat('fa-IR').format(preview.invalid.length)}</b></span></div>
      {preview.valid.length > 0 && <><h3>پیش‌نمایش کالاهای آمادهٔ ثبت</h3><div className="table-scroll product-import-table"><table className="data-table"><thead><tr><th>ردیف فایل</th><th>نام کالا</th><th>واحد</th><th>قیمت فروش</th><th>نوع مالیاتی</th><th>دسته‌بندی</th></tr></thead><tbody>{preview.valid.slice(0, 50).map(item => <tr key={item.rowNumber}><td>{item.rowNumber}</td><td>{item.data.name}</td><td>{item.data.unit}</td><td>{new Intl.NumberFormat('fa-IR').format(Number(item.data.sale_price || 0))}</td><td>{item.data.tax_type === 'OFFICIAL' ? 'رسمی / مشمول مالیات' : 'غیررسمی / غیرمشمول مالیات'}</td><td>{item.categoryLabels.join('، ') || '—'}</td></tr>)}</tbody></table>{preview.valid.length > 50 && <p>۵۰ ردیف اول از {new Intl.NumberFormat('fa-IR').format(preview.valid.length)} کالای سالم نمایش داده شده است.</p>}</div></>}
      {preview.invalid.length > 0 && <><h3>کالاهای مشکل‌دار</h3><div className="product-import-errors">{preview.invalid.map(item => <article key={item.rowNumber}><strong>ردیف {new Intl.NumberFormat('fa-IR').format(item.rowNumber)}</strong><span>{item.data?.name || 'نام وارد نشده'}</span><ul>{item.errors.map((error, index) => <li key={index}>{error}</li>)}</ul></article>)}</div></>}
    </div>}
    <footer className="product-import-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>انصراف</button><button type="button" className="btn btn-primary" disabled={busy || !preview?.valid?.length} onClick={confirmImport}><FiCheck /> تأیید و ذخیرهٔ {new Intl.NumberFormat('fa-IR').format(preview?.valid?.length || 0)} کالای سالم</button></footer>
  </section></div>
}
