import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FiCheck, FiCreditCard, FiDatabase, FiEdit2, FiEye, FiFileText, FiInfo, FiMove, FiPackage, FiPercent, FiPlus, FiPrinter, FiSettings, FiShield, FiTrash2, FiUpload, FiX } from 'react-icons/fi'
import { api, getErrorMessage, unwrap } from '../services/api'
import JalaliDateInput from '../components/JalaliDateInput'
import SearchableSelect from '../components/SearchableSelect'
import { formatPersianDate } from '../utils/persianDate'

const sections = [
  { id: 'general', label: 'عمومی', icon: FiSettings, title: 'تنظیمات عمومی', description: 'مشخصات حقوقی، راه‌های تماس، نشانی‌ها و هویت بصری شرکت.' },
  { id: 'tax', label: 'مالیاتی', icon: FiPercent, title: 'تنظیمات مالیاتی', description: 'قواعد مالیات و عوارض مورد استفاده در اسناد خرید و فروش.' },
  { id: 'finance', label: 'مالی', icon: FiCreditCard, title: 'تنظیمات مالی', description: 'واحد پول پایه، دورهٔ مالی و تنظیمات پایهٔ مالی سامانه.' },
  { id: 'inventory', label: 'انبار', icon: FiPackage, title: 'تنظیمات انبار', description: 'قواعد پایه برای کنترل موجودی و عملیات انبار.' },
  { id: 'access', label: 'امنیت و دسترسی', icon: FiShield, title: 'امنیت و دسترسی', description: 'گزینه‌های مدیریتی مرتبط با ورود کاربران و دسترسی به سامانه.' },
  { id: 'print', label: 'چاپ و قالب اسناد', icon: FiPrinter, title: 'چاپ و قالب اسناد', description: 'پیش‌فرض‌های صفحهٔ چاپ و مدیریت قالب‌های فاکتور و اسناد.' },
]
const emptyCompany = { displayName: '', legalName: '', tradeName: '', legalForm: '', nationalId: '', economicNumber: '', registrationNumber: '', phoneNumbers: [], mobileNumbers: [], email: '', departmentEmails: [], website: '', socialAccounts: [], addresses: [], signatoryName: '', signatoryTitle: '', logoPath: null, stampPath: null }
const newPhone = () => ({ label: '', number: '', extension: '' })
const newMobile = () => ({ label: '', number: '' })
const newDepartmentEmail = () => ({ label: '', email: '' })
const newSocial = () => ({ platform: '', label: '', handle: '', url: '' })
const newAddress = () => ({ label: '', province: '', city: '', address: '', postalCode: '', mapUrl: '', latitude: '', longitude: '' })

export default function SettingsPage() {
  const [searchParams] = useSearchParams()
  const requestedSection = searchParams.get('section')
  const activeId = sections.some(section => section.id === requestedSection) ? requestedSection : sections[0].id
  const active = sections.find(section => section.id === activeId) || sections[0]
  const ActiveIcon = active.icon

  return <section className="resource-page settings-page">
    <header className="page-heading"><div><h1>تنظیمات سیستمی</h1><p>تنظیمات پایهٔ سامانه را از زیرمنوهای این بخش مدیریت کنید.</p></div></header>
    <div className="settings-layout">
      <section className="panel settings-panel" id={`settings-panel-${active.id}`} aria-label={active.title}>
        <header className="settings-panel-heading"><span className="settings-panel-icon"><ActiveIcon/></span><div><h2>{active.title}</h2><p>{active.description}</p></div></header>
        {active.id === 'general' ? <CompanyGeneralSettings/> : active.id === 'tax' ? <TaxSettingsDraft/> : active.id === 'finance' ? <FinanceSettingsDraft/> : active.id === 'inventory' ? <InventorySettings/> : active.id === 'access' ? <SecuritySettings/> : active.id === 'print' ? <PrintSettings/> : <SettingsPlaceholder section={active}/>}
      </section>
    </div>
  </section>
}

function TaxSettingsDraft() {
  const user = useSelector(state => state.session.user)
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const permissions = user?.permissions || []
  const canRead = isAdmin || permissions.includes('settings.tax.read')
  const canUpdate = isAdmin || permissions.includes('settings.tax.update')
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('unset')
  const [priceIncludesTax, setPriceIncludesTax] = useState(false)
  const [rounding, setRounding] = useState('document')
  const [vatRate, setVatRate] = useState('')
  const query = useQuery({ queryKey: ['settings', 'tax'], queryFn: async () => unwrap(await api.get('/settings/tax')), enabled: canRead })
  const mutation = useMutation({
    mutationFn: async payload => unwrap(await api.put('/settings/tax', payload)),
    onSuccess: data => {
      queryClient.setQueryData(['settings', 'tax'], data)
      setStatus(data.taxpayerStatus)
      setPriceIncludesTax(data.priceIncludesVat)
      setRounding(data.roundingMethod)
      setVatRate(data.vatRate == null ? '' : String(data.vatRate))
      toast.success('تنظیمات مالیاتی ذخیره شد')
    },
    onError: error => toast.error(getErrorMessage(error)),
  })
  useEffect(() => {
    if (!query.data) return
    setStatus(query.data.taxpayerStatus)
    setPriceIncludesTax(query.data.priceIncludesVat)
    setRounding(query.data.roundingMethod)
    setVatRate(query.data.vatRate == null ? '' : String(query.data.vatRate))
  }, [query.data])
  const currentJalaliYear = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', timeZone: 'Asia/Tehran' }).formatToParts(new Date()).find(part => part.type === 'year')?.value
  const jalaliYear = new Intl.NumberFormat('fa-IR').format(query.data?.taxYear || Number(currentJalaliYear))
  const submit = event => {
    event.preventDefault()
    const normalizedRate = vatRate.trim().replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[٫،]/g, '.').replace(/,/g, '')
    mutation.mutate({ taxpayerStatus: status, priceIncludesVat, roundingMethod: rounding, vatRate: normalizedRate === '' ? null : Number(normalizedRate) })
  }
  if (!canRead) return <div className="error-state settings-access-error"><FiShield/><strong>مجوز مشاهدهٔ تنظیمات مالیاتی را ندارید.</strong></div>
  if (query.isLoading) return <div className="loading-line" />
  if (query.isError) return <div className="error-state"><FiInfo/><strong>دریافت تنظیمات مالیاتی انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button type="button" className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div>
  const statuses = [['unset', 'تعیین نشده'], ['taxable', 'مشمول'], ['exempt', 'معاف']]
  return <div className="tax-settings-draft">
    <form className="tax-settings-form" onSubmit={submit}>
    <section className="tax-settings-section">
      <div className="tax-section-heading"><div><h3>وضعیت مالیاتی شرکت</h3><p>اگر از وضعیت شرکت مطمئن نیستید، «تعیین نشده» را نگه دارید.</p></div></div>
      <div className="tax-choice-grid">{statuses.map(([value, label]) => <button key={value} type="button" disabled={!canUpdate} className={`tax-choice${status === value ? ' active' : ''}`} aria-pressed={status === value} onClick={() => setStatus(value)}><span className="tax-choice-indicator"/><span><strong>{label}</strong><small>{value === 'unset' ? 'بعداً قابل تنظیم است' : value === 'taxable' ? 'محاسبهٔ مالیات در اسناد' : 'عدم محاسبه به‌صورت پیش‌فرض'}</small></span></button>)}</div>
    </section>
    <section className="tax-settings-section">
      <div className="tax-section-heading"><div><h3>پیش‌فرض‌های محاسبه</h3><p>این انتخاب‌ها پیش‌فرض‌اند و در صورت نیاز می‌توان آن‌ها را در سند تغییر داد.</p></div></div>
      <div className="tax-defaults-grid">
        <div className="tax-default-card"><strong>قیمت فروش شامل مالیات باشد؟</strong><p>تعیین می‌کند مالیات به مبلغ قیمت اضافه شود یا از مبلغ شامل مالیات محاسبه گردد.</p><div className="tax-segmented"><button type="button" disabled={!canUpdate} className={priceIncludesTax ? 'active' : ''} aria-pressed={priceIncludesTax} onClick={() => setPriceIncludesTax(true)}>بله، شامل مالیات</button><button type="button" disabled={!canUpdate} className={!priceIncludesTax ? 'active' : ''} aria-pressed={!priceIncludesTax} onClick={() => setPriceIncludesTax(false)}>خیر، جداگانه</button></div></div>
        <div className="tax-default-card"><strong>روش گرد کردن</strong><p>نحوهٔ گرد کردن مبلغ محاسبه‌شدهٔ مالیات.</p><div className="tax-segmented"><button type="button" disabled={!canUpdate} className={rounding === 'line' ? 'active' : ''} aria-pressed={rounding === 'line'} onClick={() => setRounding('line')}>در هر ردیف</button><button type="button" disabled={!canUpdate} className={rounding === 'document' ? 'active' : ''} aria-pressed={rounding === 'document'} onClick={() => setRounding('document')}>در کل سند</button></div></div>
      </div>
    </section>
    <section className="tax-settings-section">
      <div className="tax-section-heading"><div><h3>نرخ مالیات بر ارزش افزوده</h3><p>در این بخش فقط نرخ مورد استفاده برای سال جاری مشخص می‌شود.</p></div><span className="tax-year-badge">سال مالیاتی {jalaliYear}</span></div>
      <div className="annual-vat-card"><span className="tax-empty-icon"><FiPercent/></span><div className="annual-vat-copy"><strong>مالیات بر ارزش افزودهٔ سال جاری</strong><small>درصد نرخ معتبر برای سال {jalaliYear} را وارد کنید.</small></div><label className="form-field annual-vat-input"><span>نرخ</span><div className="tax-percent-field"><input className="form-control" inputMode="decimal" value={vatRate} placeholder="۰" aria-label="نرخ مالیات بر ارزش افزوده به درصد" disabled={!canUpdate} onChange={event => setVatRate(event.target.value)}/><span>٪</span></div></label></div>
    </section>
    <footer className="tax-settings-footer"><span><FiInfo/> فیلدها اجباری نیستند. تنظیمات بر اساس سال شمسی ثبت می‌شوند.</span>{canUpdate && <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? <span className="spinner"/> : <FiCheck/>} ذخیرهٔ تنظیمات مالیاتی</button>}</footer>
    </form>
    <MoadianSettings canRead={canRead} canUpdate={canUpdate}/>
  </div>
}

function MoadianSettings({ canRead, canUpdate }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ environment: 'sandbox', deliveryMode: 'direct', fiscalMemoryId: '', intermediaryName: '' })
  const query = useQuery({ queryKey: ['settings', 'moadian'], queryFn: async () => unwrap(await api.get('/settings/moadian')), enabled: canRead })
  useEffect(() => {
    if (query.data) setForm({ ...query.data, fiscalMemoryId: query.data.fiscalMemoryId || '', intermediaryName: query.data.intermediaryName || '' })
  }, [query.data])
  const save = useMutation({
    mutationFn: async payload => unwrap(await api.put('/settings/moadian', payload)),
    onSuccess: data => { queryClient.setQueryData(['settings', 'moadian'], data); setForm({ ...data, fiscalMemoryId: data.fiscalMemoryId || '', intermediaryName: data.intermediaryName || '' }); toast.success('اطلاعات پایهٔ مؤدیان ذخیره شد') },
    onError: error => toast.error(getErrorMessage(error)),
  })
  if (query.isLoading) return <section className="tax-settings-section"><div className="loading-line"/></section>
  if (query.isError) return <section className="tax-settings-section"><div className="error-state"><FiInfo/><strong>دریافت پیکربندی مؤدیان انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button type="button" className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div></section>
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const hasBaseIdentity = Boolean(form.fiscalMemoryId.trim()) && (form.deliveryMode === 'direct' || Boolean(form.intermediaryName.trim()))
  const submit = event => { event.preventDefault(); save.mutate({ environment: form.environment, deliveryMode: form.deliveryMode, fiscalMemoryId: form.fiscalMemoryId.trim() || null, intermediaryName: form.deliveryMode === 'intermediary' ? form.intermediaryName.trim() || null : null }) }
  return <section className="moadian-settings-section">
    <header className="tax-section-heading"><div><h3>پیکربندی سامانهٔ مؤدیان</h3><p>شناسه و مسیر ارسال را برای آماده‌سازی اتصال ثبت کنید.</p></div><span className={`tax-moadian-status ${hasBaseIdentity ? 'is-configured' : ''}`}>{hasBaseIdentity ? 'اطلاعات پایه ثبت شده' : 'نیازمند پیکربندی'}</span></header>
    <form className="moadian-settings-form" onSubmit={submit}>
      <div className="moadian-config-grid">
        <label className="form-field inventory-setting-field"><span>محیط اتصال</span><SearchableSelect className="form-control" value={form.environment} disabled={!canUpdate} onChange={event => set('environment', event.target.value)}><option value="sandbox">آزمایشی</option><option value="production">عملیاتی</option></SearchableSelect><small>تا پیش از راه‌اندازی و بررسی اتصال، محیط آزمایشی را انتخاب کنید.</small></label>
        <label className="form-field inventory-setting-field"><span>روش ارسال</span><SearchableSelect className="form-control" value={form.deliveryMode} disabled={!canUpdate} onChange={event => { set('deliveryMode', event.target.value); if (event.target.value === 'direct') set('intermediaryName', '') }}><option value="direct">ارسال مستقیم</option><option value="intermediary">از طریق شرکت معتمد</option></SearchableSelect><small>این انتخاب تعیین می‌کند اتصال با زیرساخت خود شرکت انجام شود یا از ارائه‌دهندهٔ واسط.</small></label>
        <label className="form-field inventory-setting-field"><span>شناسهٔ یکتای حافظهٔ مالیاتی</span><input className="form-control" value={form.fiscalMemoryId} disabled={!canUpdate} maxLength={64} onChange={event => set('fiscalMemoryId', event.target.value)} placeholder="شناسهٔ دریافتی از کارپوشهٔ مالیاتی"/><small>این شناسه را از کارپوشهٔ سامانهٔ مؤدیان وارد کنید.</small></label>
        {form.deliveryMode === 'intermediary' && <label className="form-field inventory-setting-field"><span>نام شرکت معتمد</span><input className="form-control" value={form.intermediaryName} disabled={!canUpdate} maxLength={160} onChange={event => set('intermediaryName', event.target.value)} placeholder="نام ارائه‌دهندهٔ خدمات مالیاتی"/><small>نام سرویس‌دهنده‌ای که قرارداد و مشخصات اتصال آن را دارید.</small></label>}
      </div>
      <div className="moadian-setup-note"><FiInfo/><span>این فرم فقط اطلاعات پایه را نگه می‌دارد. ارسال صورتحساب تا زمان تعیین مستندات اتصال، گواهی/کلید امن و اطلاعات محیط انتخابی فعال نمی‌شود. کلید خصوصی یا رمز را در این صفحه وارد نکنید.</span></div>
      {canUpdate && <footer className="tax-settings-footer"><span><FiInfo/> اطلاعات پایهٔ اتصال؛ بدون ارسال صورتحساب.</span><button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? <span className="spinner"/> : <FiCheck/>} ذخیرهٔ پیکربندی</button></footer>}
    </form>
  </section>
}

function SettingsPlaceholder({ section }) {
  const items = {
    tax: ['نرخ‌های مالیات بر ارزش افزوده', 'تاریخ اعتبار هر نرخ', 'قواعد پیش‌فرض برای کالاها و اسناد'],
    finance: ['واحد پول پایه و شیوهٔ نمایش مبالغ', 'دورهٔ مالی و سال مالی', 'حساب‌های پیش‌فرض عملیات'],
    inventory: ['اجازهٔ موجودی منفی', 'روش کنترل نقطهٔ سفارش', 'تنظیمات پیش‌فرض انبار'],
    access: ['سیاست رمز عبور', 'مدیریت نشست‌های کاربری', 'ثبت رویدادهای امنیتی'],
  }[section.id] || []
  return <><div className="settings-coming-soon"><FiInfo/><span>چارچوب این بخش آماده است. گزینه‌ها پس از تعیین قواعد و اتصال به سرویس ذخیره‌سازی فعال می‌شوند.</span></div><div className="settings-option-list">{items.map((item, index) => <div className="settings-option" key={item}><span className="settings-option-number">{new Intl.NumberFormat('fa-IR').format(index + 1)}</span><strong>{item}</strong><small>در انتظار تعریف و اتصال</small></div>)}</div><footer className="settings-panel-footer"><FiDatabase/><span>در حال حاضر این بخش اطلاعاتی را تغییر یا ذخیره نمی‌کند.</span></footer></>
}

function InventorySettings() {
  const user = useSelector(state => state.session.user)
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const permissions = user?.permissions || []
  const canRead = isAdmin || permissions.includes('settings.inventory.read')
  const canUpdate = isAdmin || permissions.includes('settings.inventory.update')
  const client = useQueryClient()
  const defaults = { purchaseWarehouseId: null, salesWarehouseId: null, productionWarehouseId: null, requireCountApproval: true, inventoryAccountId: null, stockGainAccountId: null, stockLossAccountId: null }
  const [settings, setSettings] = useState(defaults)
  const query = useQuery({ queryKey: ['settings', 'inventory'], queryFn: async () => unwrap(await api.get('/settings/inventory')), enabled: canRead })
  useEffect(() => { if (query.data?.settings) setSettings({ ...defaults, ...query.data.settings }) }, [query.data])
  const mutation = useMutation({ mutationFn: async body => unwrap(await api.put('/settings/inventory', body)), onSuccess: data => { client.setQueryData(['settings', 'inventory'], data); client.invalidateQueries({ queryKey: ['settings', 'inventory', 'defaults'] }); setSettings({ ...defaults, ...data.settings }); toast.success('تنظیمات انبار ذخیره شد') }, onError: error => toast.error(getErrorMessage(error)) })
  const setField = (field, value) => setSettings(current => ({ ...current, [field]: value || null }))
  if (!canRead) return <div className="error-state settings-access-error"><FiShield/><strong>مجوز مشاهدهٔ تنظیمات انبار را ندارید.</strong></div>
  if (query.isLoading) return <div className="loading-line" />
  if (query.isError) return <div className="error-state"><FiInfo/><strong>دریافت تنظیمات انبار انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button type="button" className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div>
  const warehouses = query.data?.warehouses || []
  const accounts = query.data?.accounts || []
  const warehouseOptions = warehouses.map(row => ({ id: row.id, label: `${row.name} (${row.code})` }))
  const accountOptions = accounts.map(row => ({ id: row.id, label: `${row.code} · ${row.name}` }))
  const accountSelect = (field, label, hint, allowedTypes) => <label className="form-field inventory-setting-field" key={field}><span>{label}<SettingInfo text={hint}/></span><SearchableSelect value={settings[field] || ''} options={accountOptions.filter(option => allowedTypes.includes(accounts.find(row => row.id === option.id)?.account_type))} onChange={value => setField(field, value)} disabled={!canUpdate} placeholder="حساب را جست‌وجو و انتخاب کنید"/><small>فقط حساب‌های فعال و قابل ثبت نمایش داده می‌شوند.</small></label>
  const warehouseSelect = (field, label) => <label className="form-field inventory-setting-field" key={field}><span>{label}</span><SearchableSelect value={settings[field] || ''} options={warehouseOptions} onChange={value => setField(field, value)} disabled={!canUpdate} placeholder="انبار را جست‌وجو و انتخاب کنید"/><small>اختیاری؛ هنگام ثبت سند می‌توانید انبار دیگری انتخاب کنید.</small></label>
  const submit = event => { event.preventDefault(); mutation.mutate(settings) }
  return <form className="inventory-settings-draft" onSubmit={submit}>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>انبارهای پیش‌فرض عملیات</h3><p>برای سرعت ثبت اسناد، انبار اولیهٔ هر فرایند را مشخص کنید.</p></div></div><div className="finance-settings-grid">{warehouseSelect('purchaseWarehouseId','دریافت فاکتور خرید')}{warehouseSelect('salesWarehouseId','ارسال فاکتور فروش')}{warehouseSelect('productionWarehouseId','عملیات تولید')}</div></section>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>کنترل انبارگردانی</h3><p>اختلاف شمارش تا زمان تأیید در موجودی و حسابداری اعمال نمی‌شود.</p></div></div><FinanceToggle title="تأیید انبارگردانی پیش از اعمال اختلاف" info="با روشن‌بودن این گزینه، ثبت شمارش فقط پیش‌نویس اختلاف می‌سازد. کاربر دارای مجوز تأیید باید آن را تأیید کند تا موجودی و سند حسابداری به‌روزرسانی شوند." checked={settings.requireCountApproval} disabled={!canUpdate} onChange={value => setSettings(current => ({ ...current, requireCountApproval: value }))}/></section>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>حساب‌های تعدیل موجودی</h3><p>برای سند حسابداری اختلاف شمارش، حساب‌های مرتبط را تعیین کنید.</p></div></div><div className="finance-settings-grid">{accountSelect('inventoryAccountId','حساب موجودی کالا','حساب دارایی موجودی که در طرف مقابل تعدیل ثبت می‌شود.','ASSET')}{accountSelect('stockGainAccountId','حساب اضافات انبار','حساب درآمد یا هزینهٔ کاهنده برای اختلاف مثبت شمارش.',['REVENUE','EXPENSE'])}{accountSelect('stockLossAccountId','حساب کسری انبار','حساب هزینهٔ کسری موجودی.','EXPENSE')}</div><div className="settings-coming-soon"><FiInfo/><span>برای ثبت خودکار سند انبارگردانی، هر سه حساب باید تعیین شوند. تا آن زمان، ثبت انبارگردانی با اختلاف مالی متوقف می‌شود تا سند ناقص ایجاد نشود.</span></div></section>
    <footer className="tax-settings-footer"><span><FiInfo/> انتخاب انبارها اختیاری است؛ حساب‌های تعدیل هنگام ثبت اختلاف لازم‌اند.</span>{canUpdate && <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? <span className="spinner"/> : <FiCheck/>} ذخیرهٔ تنظیمات انبار</button>}</footer>
  </form>
}

function SecuritySettings() {
  const user = useSelector(state => state.session.user)
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const permissions = user?.permissions || []
  const canRead = isAdmin || permissions.includes('settings.security.read')
  const canUpdate = isAdmin || permissions.includes('settings.security.update')
  const client = useQueryClient()
  const defaults = { minimumPasswordLength: 8, requireNumber: false, requireSymbol: false, sessionDurationHours: 168, recordSecurityEvents: true, eventRetentionDays: 90 }
  const [settings, setSettings] = useState(defaults)
  const query = useQuery({ queryKey: ['settings', 'security'], queryFn: async () => unwrap(await api.get('/settings/security')), enabled: canRead })
  useEffect(() => { if (query.data?.settings) setSettings({ ...defaults, ...query.data.settings }) }, [query.data])
  const mutation = useMutation({ mutationFn: async payload => unwrap(await api.put('/settings/security', payload)), onSuccess: data => { client.setQueryData(['settings', 'security'], current => ({ ...current, settings: data })); setSettings({ ...defaults, ...data }); toast.success('تنظیمات امنیتی ذخیره شد') }, onError: error => toast.error(getErrorMessage(error)) })
  const setField = (field, value) => setSettings(current => ({ ...current, [field]: value }))
  if (!canRead) return <div className="error-state settings-access-error"><FiShield/><strong>مجوز مشاهدهٔ تنظیمات امنیتی را ندارید.</strong></div>
  if (query.isLoading) return <div className="loading-line" />
  if (query.isError) return <div className="error-state"><FiInfo/><strong>دریافت تنظیمات امنیتی انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button type="button" className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div>
  const events = query.data?.events || []
  const submit = event => { event.preventDefault(); mutation.mutate({ ...settings, minimumPasswordLength: Number(settings.minimumPasswordLength), sessionDurationHours: Number(settings.sessionDurationHours), eventRetentionDays: Number(settings.eventRetentionDays) }) }
  const eventLabels = { LOGIN_SUCCESS: 'ورود موفق', LOGIN_FAILED: 'تلاش ورود ناموفق', LOGOUT: 'خروج', PASSWORD_CHANGED: 'تغییر رمز عبور', ADMIN_PASSWORD_RESET: 'بازنشانی رمز توسط مدیر', USER_DISABLED: 'غیرفعال‌شدن کاربر', USER_ENABLED: 'فعال‌شدن کاربر', USER_ROLE_CHANGED: 'تغییر نقش کاربر' }
  const sessionOptions = [{ id: 8, label: '۸ ساعت' }, { id: 24, label: '۲۴ ساعت' }, { id: 72, label: '۳ روز' }, { id: 168, label: '۷ روز' }]
  const lengthOptions = [8, 10, 12, 14].map(value => ({ id: value, label: `${new Intl.NumberFormat('fa-IR').format(value)} نویسه` }))
  const retentionOptions = [{ id: 30, label: '۳۰ روز' }, { id: 90, label: '۹۰ روز' }, { id: 180, label: '۱۸۰ روز' }]
  return <form className="security-settings-draft" onSubmit={submit}>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>سیاست رمز عبور</h3><p>این قواعد هنگام ساخت کاربر، بازنشانی رمز و تغییر رمز اعمال می‌شوند.</p></div></div><div className="finance-settings-grid">
      <label className="form-field inventory-setting-field"><span>حداقل طول رمز عبور</span><SearchableSelect value={String(settings.minimumPasswordLength)} options={lengthOptions} onChange={value => setField('minimumPasswordLength', Number(value))} disabled={!canUpdate} placeholder="انتخاب حداقل طول"/><small>رمز عبور همچنان حداکثر ۷۲ بایت است؛ حساب‌های قبلی با رمز فعلی خود وارد می‌شوند.</small></label>
      <div className="security-toggle-wrap"><FinanceToggle title="الزام وجود رقم" info="رمز عبور باید دست‌کم یک رقم داشته باشد. ارقام فارسی و لاتین پذیرفته می‌شوند." checked={settings.requireNumber} disabled={!canUpdate} onChange={value => setField('requireNumber', value)}/></div>
      <div className="security-toggle-wrap"><FinanceToggle title="الزام وجود نماد" info="رمز عبور باید دست‌کم یک نماد مانند ! یا @ داشته باشد." checked={settings.requireSymbol} disabled={!canUpdate} onChange={value => setField('requireSymbol', value)}/></div>
    </div></section>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>نشست‌های کاربری</h3><p>نشست پس از این مدت بی‌فعالیتی منقضی می‌شود و کاربر باید دوباره وارد شود.</p></div></div><div className="finance-settings-grid"><label className="form-field inventory-setting-field"><span>مدت بی‌فعالیتی مجاز</span><SearchableSelect value={String(settings.sessionDurationHours)} options={sessionOptions} onChange={value => setField('sessionDurationHours', Number(value))} disabled={!canUpdate} placeholder="انتخاب مدت"/><small>آخرین فعالیت کاربر در درخواست‌های سامانه به‌روزرسانی می‌شود.</small></label></div></section>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>رویدادهای امنیتی</h3><p>ورودها، تلاش‌های ناموفق، تغییر رمز و تغییرات دسترسی ثبت می‌شوند.</p></div></div><FinanceToggle title="ثبت رویدادهای امنیتی" info="با خاموش‌کردن این گزینه، رویدادهای جدید ذخیره نمی‌شوند. رویدادهای قبلی تا پایان بازهٔ نگهداری باقی می‌مانند." checked={settings.recordSecurityEvents} disabled={!canUpdate} onChange={value => setField('recordSecurityEvents', value)}/><div className="finance-settings-grid security-retention-grid"><label className="form-field inventory-setting-field"><span>مدت نگهداری رویدادها</span><SearchableSelect value={String(settings.eventRetentionDays)} options={retentionOptions} onChange={value => setField('eventRetentionDays', Number(value))} disabled={!canUpdate} placeholder="انتخاب مدت"/><small>رویدادهای قدیمی‌تر هنگام ثبت رویداد تازه پاک می‌شوند.</small></label></div>
      <div className="security-events-card"><div className="security-events-heading"><strong>آخرین رویدادها</strong><span>{new Intl.NumberFormat('fa-IR').format(events.length)} مورد اخیر</span></div>{events.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>رویداد</th><th>کاربر</th><th>نشانی شبکه</th><th>زمان</th></tr></thead><tbody>{events.map(item => <tr key={item.id}><td>{eventLabels[item.event_type] || item.event_type}</td><td>{item.username || '—'}</td><td dir="ltr">{item.ip_address || '—'}</td><td>{item.created_at ? formatPersianDate(item.created_at, true) : '—'}</td></tr>)}</tbody></table></div> : <div className="security-events-empty">رویدادی ثبت نشده است.</div>}</div>
    </section>
    <footer className="tax-settings-footer"><span><FiInfo/> سیاست رمز برای رمزهای تازه و تغییر یافته اعمال می‌شود؛ رمزهای موجود خودکار تغییر نمی‌کنند.</span>{canUpdate && <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? <span className="spinner"/> : <FiCheck/>} ذخیرهٔ تنظیمات امنیتی</button>}</footer>
  </form>
}

function PrintSettings() {
  const user = useSelector(state => state.session.user)
  const canRead = user?.rolename?.toLowerCase() === 'مدیر سایت' || user?.permissions?.includes('settings.general.read')
  const canUpdate = user?.rolename?.toLowerCase() === 'مدیر سایت' || user?.permissions?.includes('settings.general.update')
  const queryClient = useQueryClient()
  const [printOptions, setPrintOptions] = useState({ paper: 'A4', orientation: 'portrait', margins: 'normal', openDialog: true })
  const [templates, setTemplates] = useState([
    { id: 'official', name: 'فاکتور رسمی', size: 'A4', orientation: 'portrait', description: 'مناسب چاپ فاکتور فروش با اطلاعات کامل شرکت و مشتری', tags: ['فروش', 'خرید'], logo: true, stamp: true, elements: initialPrintElements('فاکتور فروش', true, true) },
    { id: 'simple', name: 'فاکتور ساده', size: 'A4', orientation: 'portrait', description: 'چیدمان خلوت برای چاپ روزمره و ارائه به مشتری', tags: ['فروش', 'پیش‌فاکتور'], logo: true, stamp: false, elements: initialPrintElements('فاکتور فروش', true, false) },
    { id: 'thermal', name: 'فاکتور حرارتی', size: '۸۰ میلی‌متر', orientation: 'portrait', description: 'نسخهٔ فشرده برای چاپگرهای رسید حرارتی', tags: ['فروش'], logo: false, stamp: false, elements: initialPrintElements('رسید فروش', false, false) },
  ])
  const [defaults, setDefaults] = useState({ فروش: 'official', خرید: 'official', پیش‌فاکتور: 'simple' })
  const [editingId, setEditingId] = useState(null)
  const [previewId, setPreviewId] = useState(null)
  const settingsQuery = useQuery({ queryKey: ['settings-print'], queryFn: async () => unwrap(await api.get('/settings/print')), enabled: canRead })
  useEffect(() => {
    if (!settingsQuery.data) return
    if (settingsQuery.data.printOptions) setPrintOptions(current => ({ ...current, ...settingsQuery.data.printOptions }))
    if (Array.isArray(settingsQuery.data.templates) && settingsQuery.data.templates.length) setTemplates(settingsQuery.data.templates)
    if (settingsQuery.data.defaults && Object.keys(settingsQuery.data.defaults).length) setDefaults(settingsQuery.data.defaults)
  }, [settingsQuery.data])
  const saveSettings = useMutation({ mutationFn: async payload => unwrap(await api.put('/settings/print', payload)), onSuccess: result => { queryClient.setQueryData(['settings-print'], result); toast.success('تنظیمات چاپ و قالب‌ها ذخیره شد') }, onError: error => toast.error(getErrorMessage(error)) })
  const saveAll = () => saveSettings.mutate({ printOptions, templates, defaults })
  const designTemplate = templates.find(item => item.id === editingId)
  const preview = templates.find(item => item.id === previewId)
  const updateOption = (key, value) => setPrintOptions(current => ({ ...current, [key]: value }))
  const updateTemplate = (key, value) => setTemplates(current => current.map(item => item.id === editingId ? { ...item, [key]: value } : item))
  const createTemplate = () => {
    const id = `draft-${Date.now()}`
    setTemplates(current => [...current, { id, name: 'قالب جدید', size: 'A4', orientation: 'portrait', description: 'قالب سفارشی شرکت', tags: ['فروش'], logo: true, stamp: false, elements: initialPrintElements('فاکتور فروش', true, false) }])
    setEditingId(id)
  }
  if (!canRead) return <div className="error-state"><FiInfo/><strong>دسترسی مشاهدهٔ تنظیمات چاپ را ندارید</strong></div>
  return <div className="print-settings-draft">
    {settingsQuery.isLoading ? <div className="loading-line"/> : settingsQuery.isError ? <div className="error-state"><FiInfo/><strong>دریافت تنظیمات چاپ انجام نشد</strong><span>{getErrorMessage(settingsQuery.error)}</span><button type="button" className="btn btn-secondary" onClick={() => settingsQuery.refetch()}>تلاش دوباره</button></div> : null}
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>پیش‌فرض‌های چاپ</h3><p>قواعد اولیهٔ صفحه برای پیش‌نمایش اسناد چاپی.</p></div></div>
      <div className="finance-settings-grid">
        <label className="form-field inventory-setting-field"><span>اندازهٔ کاغذ</span><SearchableSelect className="form-control" value={printOptions.paper} onChange={event => updateOption('paper', event.target.value)}><option value="A4">A4</option><option value="A5">A5</option><option value="thermal">حرارتی ۸۰ میلی‌متر</option></SearchableSelect><small>قالب فاکتور می‌تواند اندازهٔ اختصاصی خودش را داشته باشد.</small></label>
        <label className="form-field inventory-setting-field"><span>جهت صفحه</span><SearchableSelect className="form-control" value={printOptions.orientation} onChange={event => updateOption('orientation', event.target.value)}><option value="portrait">عمودی</option><option value="landscape">افقی</option></SearchableSelect><small>برای اسناد عریض، حالت افقی مناسب‌تر است.</small></label>
        <label className="form-field inventory-setting-field"><span>حاشیهٔ صفحه</span><SearchableSelect className="form-control" value={printOptions.margins} onChange={event => updateOption('margins', event.target.value)}><option value="normal">معمولی</option><option value="compact">کم</option><option value="wide">زیاد</option></SearchableSelect><small>حاشیهٔ کم فضای بیشتری برای جدول اقلام می‌دهد.</small></label>
      </div>
      <div className="print-printer-note"><span className="print-note-icon"><FiPrinter/></span><div><strong>انتخاب چاپگر</strong><p>چاپگر از پنجرهٔ چاپ مرورگر یا سیستم‌عامل انتخاب می‌شود. سامانه در این صفحه چاپگر رایانه را تغییر نمی‌دهد.</p></div><span className="print-local-badge">محلی</span></div>
    </section>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>قالب پیش‌فرض اسناد</h3><p>برای هر نوع سند، قالبی را که به‌صورت پیش‌فرض باز شود انتخاب کنید.</p></div></div>
      <div className="print-default-grid">{Object.entries(defaults).map(([type, templateId]) => <label className="form-field inventory-setting-field" key={type}><span>{type}</span><SearchableSelect className="form-control" value={templateId} onChange={event => setDefaults(current => ({ ...current, [type]: event.target.value }))}>{templates.map(template => <option key={template.id} value={template.id}>{template.name} · {template.size}</option>)}</SearchableSelect></label>)}</div>
    </section>
    <section className="finance-settings-section"><div className="finance-section-heading"><div><h3>قالب‌های چاپ</h3><p>قالب‌ها را برای کاربردهای مختلف بسازید، ویرایش کنید و پیش‌نمایش بگیرید.</p></div><button type="button" className="btn btn-primary" onClick={createTemplate}><FiPlus/> ساخت قالب</button></div>
      <div className="print-template-grid">{templates.map(template => <article className="print-template-card" key={template.id}><div className={`print-template-thumb ${template.size === '۸۰ میلی‌متر' ? 'thermal' : ''}`}><span className="print-thumb-mark">{template.logo ? 'لوگو' : 'شرکت'}</span><span className="print-thumb-title">{template.name}</span><i/><i/><i/><div className="print-thumb-total">جمع کل　 ۱۲٬۵۰۰٬۰۰۰</div>{template.stamp && <b>مهر</b>}</div><div className="print-template-copy"><div className="print-template-title"><strong>{template.name}</strong><span>{template.size}</span></div><p>{template.description}</p><div className="print-template-tags">{template.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="print-template-actions"><button type="button" className="btn btn-secondary" onClick={() => setPreviewId(template.id)}><FiEye/> پیش‌نمایش</button><button type="button" className="btn btn-secondary" disabled={!canUpdate} onClick={() => setEditingId(template.id)}><FiEdit2/> ویرایش</button></div></div></article>)}</div>
    </section>
    {canUpdate && <footer className="tax-settings-footer"><span><FiInfo/> تغییرات تا زمان ذخیره در همین صفحه می‌مانند.</span><button type="button" className="btn btn-primary" disabled={saveSettings.isPending || settingsQuery.isLoading || settingsQuery.isError} onClick={saveAll}>{saveSettings.isPending ? <span className="spinner"/> : <FiCheck/>} ذخیرهٔ تنظیمات چاپ</button></footer>}
    {designTemplate && <PrintTemplateDesigner key={designTemplate.id} template={designTemplate} onUpdate={updateTemplate} onClose={() => setEditingId(null)}/>}
    {preview && <div className="print-editor-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewId(null) }}><section className="print-preview-modal" role="dialog" aria-modal="true" aria-labelledby="print-preview-title"><header><div><span><FiEye/></span><div><h3 id="print-preview-title">پیش‌نمایش · {preview.name}</h3><p>{preview.size} · {preview.orientation === 'portrait' ? 'عمودی' : 'افقی'}</p></div></div><button type="button" className="icon-button" aria-label="بستن" onClick={() => setPreviewId(null)}><FiX/></button></header><div className={`print-paper-preview ${preview.size === '۸۰ میلی‌متر' ? 'thermal' : ''}`}><div className="preview-company">{preview.logo && <span>لوگوی شرکت</span>}<strong>نام شرکت شما</strong><small>شناسه ملی: — · تلفن: —</small></div><h4>فاکتور فروش</h4><div className="preview-meta"><span>شماره: ۱۴۰۵-۰۰۱۲</span><span>تاریخ: ۱۴۰۵/۰۸/۱۰</span></div><div className="preview-customer">خریدار: فروشگاه نمونه　　شناسه: —</div><div className="preview-lines"><div><b>شرح کالا</b><b>تعداد</b><b>مبلغ</b></div><div><span>کالای نمونه</span><span>۲</span><span>۱۲٬۵۰۰٬۰۰۰</span></div><div><span>خدمات ارسال</span><span>۱</span><span>۵۰۰٬۰۰۰</span></div></div><div className="preview-sum">جمع کل: ۱۳٬۰۰۰٬۰۰۰ ریال</div><footer>{preview.stamp && <span>محل مهر شرکت</span>}<span>امضای خریدار</span></footer></div><div className="print-preview-actions"><span><FiInfo/> نمونهٔ نمایشی قالب است؛ هنوز به دادهٔ واقعی متصل نیست.</span><button type="button" className="btn btn-secondary" onClick={() => setPreviewId(null)}>بستن پیش‌نمایش</button></div></section></div>}
  </div>
}

function initialPrintElements(title = 'فاکتور فروش', withLogo = true, withStamp = true) {
  return [
    ...(withLogo ? [{ id: 'logo', type: 'logo', label: 'لوگوی شرکت', value: 'لوگوی شرکت', x: 76, y: 4, w: 17, fontSize: 10, align: 'center', color: '#64748b', bold: false }] : []),
    { id: 'company', type: 'company', label: 'مشخصات شرکت', value: 'نام شرکت شما\nشناسه ملی: — · تلفن: —', x: 8, y: 4, w: 58, fontSize: 11, align: 'right', color: '#27364a', bold: true },
    { id: 'title', type: 'title', label: 'عنوان سند', value: title, x: 30, y: 17, w: 40, fontSize: 17, align: 'center', color: '#172033', bold: true },
    { id: 'meta', type: 'field', label: 'شمارهٔ سند', value: 'شماره', binding: 'invoice.number', x: 7, y: 26, w: 25, fontSize: 10, align: 'right', color: '#344054', bold: false },
    { id: 'date', type: 'field', label: 'تاریخ سند', value: 'تاریخ', binding: 'invoice.date', x: 35, y: 26, w: 25, fontSize: 10, align: 'right', color: '#344054', bold: false },
    { id: 'customer', type: 'field', label: 'نام طرف حساب', value: 'خریدار', binding: 'partner.name', x: 63, y: 26, w: 30, fontSize: 10, align: 'right', color: '#344054', bold: false },
    { id: 'divider', type: 'divider', label: 'خط جداکننده', value: '', x: 7, y: 37, w: 86, fontSize: 1, align: 'right', color: '#d7dee7', bold: false },
    { id: 'table', type: 'table', label: 'جدول اقلام', value: 'جدول اقلام و خدمات', x: 7, y: 40, w: 86, fontSize: 10, align: 'right', color: '#344054', bold: false },
    { id: 'totals', type: 'totals', label: 'جمع و مالیات', value: 'جمع اقلام: ۱۲٬۵۰۰٬۰۰۰ ریال\nمالیات و عوارض: ۱٬۲۵۰٬۰۰۰ ریال\nمبلغ نهایی: ۱۳٬۷۵۰٬۰۰۰ ریال', x: 47, y: 71, w: 46, fontSize: 10, align: 'right', color: '#27364a', bold: true },
    ...(withStamp ? [{ id: 'stamp', type: 'stamp', label: 'مهر شرکت', value: 'مهر شرکت', x: 8, y: 78, w: 18, fontSize: 9, align: 'center', color: '#728096', bold: false }] : []),
    { id: 'signature', type: 'signature', label: 'محل امضا', value: 'امضای خریدار', x: 71, y: 85, w: 22, fontSize: 9, align: 'center', color: '#728096', bold: false },
  ]
}

const printFieldOptions = [
  ['invoice.number', 'شمارهٔ سند'], ['invoice.date', 'تاریخ سند'], ['invoice.dueDate', 'سررسید'], ['invoice.description', 'شرح سند'],
  ['company.name', 'نام شرکت'], ['company.nationalId', 'شناسهٔ ملی شرکت'], ['company.economicNumber', 'شمارهٔ اقتصادی شرکت'], ['company.phone', 'تلفن شرکت'],
  ['partner.name', 'نام طرف حساب'], ['partner.nationalId', 'شناسهٔ طرف حساب'], ['partner.phone', 'تلفن طرف حساب'], ['partner.address', 'نشانی طرف حساب'],
  ['items.name', 'نام کالا / خدمت'], ['items.quantity', 'تعداد'], ['items.unit', 'واحد'], ['items.unitPrice', 'قیمت واحد'], ['items.amount', 'مبلغ ردیف'], ['items.tax', 'مالیات ردیف'],
  ['totals.subtotal', 'جمع قبل از مالیات'], ['totals.tax', 'مالیات کل'], ['totals.discount', 'تخفیف کل'], ['totals.final', 'مبلغ نهایی'], ['totals.inWords', 'مبلغ به حروف'],
].map(([id, label]) => ({ id, label }))
const printFontOptions = [{ id: 'Vazirmatn', label: 'وزیرمتن' }, { id: 'Tahoma', label: 'Tahoma' }, { id: 'Arial', label: 'Arial' }, { id: 'serif', label: 'سریف' }]
const samplePrintValues = { 'invoice.number': '۱۴۰۵-۰۰۱۲', 'invoice.date': '۱۴۰۵/۰۸/۱۰', 'company.name': 'شرکت نمونه', 'partner.name': 'فروشگاه نمونه', 'totals.final': '۱۳٬۷۵۰٬۰۰۰ ریال' }
const printElementPalette = [
  ['title', 'عنوان سند'], ['text', 'متن آزاد'], ['label', 'لیبل'], ['company', 'مشخصات شرکت'], ['logo', 'لوگو'],
  ['field', 'فیلد پویا'], ['table', 'جدول اقلام'], ['totals', 'جمع و مالیات'],
  ['divider', 'خط جداکننده'], ['stamp', 'مهر شرکت'], ['signature', 'محل امضا'],
]

function PrintTemplateDesigner({ template, onUpdate, onClose }) {
  const [elements, setElements] = useState(() => template.elements?.length ? template.elements : initialPrintElements())
  const [selectedId, setSelectedId] = useState(elements[0]?.id || null)
  const [showGrid, setShowGrid] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)
  const [snapGuides, setSnapGuides] = useState({ x: null, y: null })
  const [pageBackground, setPageBackground] = useState(template.background || '#ffffff')
  const [zoom, setZoom] = useState(90)
  const [drag, setDrag] = useState(null)
  const stageRef = useRef(null)
  const selected = elements.find(item => item.id === selectedId)
  const persistElements = next => { setElements(next); onUpdate('elements', next) }
  const patchElement = (key, value) => persistElements(elements.map(item => item.id === selectedId ? { ...item, [key]: value } : item))
  const addElement = (type, label) => {
    const id = `element-${Date.now()}`
    const defaults = {
      title: ['فاکتور فروش', 16, true], text: ['متن دلخواه', 11, false], label: ['عنوان فیلد', 9, true], company: ['نام شرکت شما\nشناسه ملی: —', 11, true],
      logo: ['لوگوی شرکت', 10, false], field: ['فیلد تازه', 10, false],
      table: ['جدول اقلام و خدمات', 10, false], totals: ['جمع کل: ۱۳٬۰۰۰٬۰۰۰ ریال', 10, true], divider: ['', 1, false], stamp: ['مهر شرکت', 9, false], signature: ['امضای خریدار', 9, false],
    }[type]
    const item = { id, type, label, value: defaults[0], binding: type === 'field' ? '' : undefined, columns: type === 'table' ? [{ id: `${id}-name`, label: 'شرح کالا', binding: 'items.name' }, { id: `${id}-quantity`, label: 'تعداد', binding: 'items.quantity' }, { id: `${id}-amount`, label: 'مبلغ', binding: 'items.amount' }] : undefined, x: type === 'table' ? 7 : 25, y: 44 + (elements.length % 4) * 7, w: type === 'table' ? 86 : 50, fontSize: defaults[1], fontFamily: 'Vazirmatn', align: 'right', color: '#27364a', bold: defaults[2], background: 'transparent', borderColor: '#cbd5e1', borderWidth: 0, radius: 0, shadow: false }
    persistElements([...elements, item]); setSelectedId(id)
  }
  const startDrag = (event, item) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation(); setSelectedId(item.id)
    const rect = stageRef.current.getBoundingClientRect()
    setDrag({ id: item.id, dx: ((event.clientX - rect.left) / rect.width) * 100 - item.x, dy: ((event.clientY - rect.top) / rect.height) * 100 - item.y })
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const moveDrag = event => {
    if (!drag || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const moving = elements.find(item => item.id === drag.id)
    const rawX = Math.max(0, Math.min(100 - (moving?.w || 6), ((event.clientX - rect.left) / rect.width) * 100 - drag.dx))
    const rawY = Math.max(0, Math.min(100 - (moving?.h || 4), ((event.clientY - rect.top) / rect.height) * 100 - drag.dy))
    const snap = (value, size, axis) => {
      const guides = axis === 'x' ? [{ value: 0, line: 0 }, { value: 50 - size / 2, line: 50 }, { value: 100 - size, line: 100 }] : [{ value: 0, line: 0 }, { value: 50 - size / 2, line: 50 }, { value: 100 - size, line: 100 }]
      elements.filter(item => item.id !== drag.id).forEach(item => {
        const start = axis === 'x' ? item.x : item.y
        const length = axis === 'x' ? item.w : (item.h || 4)
        guides.push({ value: start, line: start }, { value: start + length - size, line: start + length }, { value: start + length / 2 - size / 2, line: start + length / 2 })
      })
      const closest = guides.reduce((best, item) => Math.abs(item.value - value) < Math.abs(best.value - value) ? item : best, guides[0])
      return Math.abs(closest.value - value) <= 1.4 ? closest : null
    }
    const xSnap = snap(rawX, moving?.w || 6, 'x')
    const ySnap = snap(rawY, moving?.h || 4, 'y')
    const x = xSnap?.value ?? rawX
    const y = ySnap?.value ?? rawY
    setSnapGuides({ x: xSnap?.line ?? null, y: ySnap?.line ?? null })
    const next = elements.map(item => item.id === drag.id ? { ...item, x: Math.round(x), y: Math.round(y) } : item)
    setElements(next); onUpdate('elements', next)
  }
  const reorderSelected = delta => {
    const index = elements.findIndex(item => item.id === selectedId)
    const target = index + delta
    if (index < 0 || target < 0 || target >= elements.length) return
    const next = [...elements]; [next[index], next[target]] = [next[target], next[index]]; persistElements(next)
  }
  const duplicateSelected = () => {
    if (!selected) return
    const copy = { ...selected, id: `element-${Date.now()}`, label: `${selected.label} (کپی)`, x: Math.min(90, selected.x + 3), y: Math.min(93, selected.y + 3) }
    persistElements([...elements, copy]); setSelectedId(copy.id)
  }
  const isThermal = template.size === '۸۰ میلی‌متر'
  const renderCanvasElement = item => {
    if (item.type === 'table') {
      const columns = item.columns || [{ id: 'name', label: 'شرح کالا', binding: 'items.name' }, { id: 'quantity', label: 'تعداد', binding: 'items.quantity' }, { id: 'amount', label: 'مبلغ', binding: 'items.amount' }]
      const line = { 'items.name': 'کالای نمونه', 'items.quantity': '۲', 'items.unit': 'عدد', 'items.unitPrice': '۶٬۲۵۰٬۰۰۰', 'items.amount': '۱۲٬۵۰۰٬۰۰۰', 'items.tax': '۱٬۲۵۰٬۰۰۰' }
      const columnsStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(40px, 1fr))` }
      return <div className="designer-item-table"><div style={columnsStyle}>{columns.map(column => <b key={column.id}>{column.label}</b>)}</div><div style={columnsStyle}>{columns.map(column => <span key={column.id}>{line[column.binding] || (previewMode ? '' : '—')}</span>)}</div></div>
    }
    if (item.type === 'divider') return <div className="designer-divider"/>
    if (item.type === 'logo') return <div className="designer-logo-placeholder">لوگو</div>
    if (item.type === 'stamp') return <div className="designer-stamp-placeholder">{item.value || 'مهر'}</div>
    if (item.type === 'signature') return <div className="designer-signature-placeholder">{item.value || 'امضا'}</div>
    if (item.type === 'totals') return <div className="designer-totals-content">{item.value.split('\n').map((line, index) => <div key={index} className={index === item.value.split('\n').length - 1 ? 'grand-total' : ''}>{line}</div>)}</div>
    if (item.type === 'field') {
      const value = item.binding ? samplePrintValues[item.binding] : ''
      return <div className={`designer-text-content designer-dynamic-field ${!value ? 'missing' : ''}`}>{previewMode ? (value ? <>{item.value}: {value}</> : '') : (value ? <>{item.value}: {value}</> : <>{item.value || 'فیلد پویا'} <small>بدون داده · در چاپ خالی</small></>)}</div>
    }
    return <div className="designer-text-content">{item.value.split('\n').map((line, index) => <div key={index}>{line}</div>)}</div>
  }
  return <div className="print-designer-backdrop"><section className="print-designer-shell" role="dialog" aria-modal="true" aria-label={`طراحی قالب ${template.name}`}>
    <header className="print-designer-topbar"><div className="designer-brand"><span><FiFileText/></span><div><strong>طراح قالب چاپ</strong><small>{template.name} · ویرایش بصری</small></div></div><div className="designer-toolbar-controls"><label>کاغذ<SearchableSelect value={template.size} onChange={event => onUpdate('size', event.target.value)}><option>A4</option><option>A5</option><option>۸۰ میلی‌متر</option></SearchableSelect></label><label>جهت<SearchableSelect value={template.orientation} onChange={event => onUpdate('orientation', event.target.value)}><option value="portrait">عمودی</option><option value="landscape">افقی</option></SearchableSelect></label><label title="رنگ پس‌زمینهٔ صفحه">پس‌زمینه<input type="color" value={pageBackground} onChange={event => { setPageBackground(event.target.value); onUpdate('background', event.target.value) }}/></label><button type="button" onClick={() => setZoom(value => Math.max(60, value - 10))}>−</button><span>{zoom}٪</span><button type="button" onClick={() => setZoom(value => Math.min(120, value + 10))}>+</button></div><div className="designer-top-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>بازگشت</button><button type="button" className="btn btn-primary" onClick={onClose}><FiCheck/> پایان طراحی</button></div></header>
    <div className="print-designer-workspace">
      <aside className="designer-palette"><div className="designer-side-heading"><strong>افزودن جزء</strong><small>برای افزودن به صفحه انتخاب کنید</small></div><div className="designer-palette-grid">{printElementPalette.map(([type, label]) => <button type="button" key={type} onClick={() => addElement(type, label)}><FiPlus/><span>{label}</span></button>)}</div><div className="designer-layers-heading"><strong>لایه‌ها</strong><span>{new Intl.NumberFormat('fa-IR').format(elements.length)}</span></div><div className="designer-layers-list">{[...elements].reverse().map(item => <button key={item.id} type="button" className={selectedId === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><span className="designer-layer-grip">⠿</span><span>{item.label}</span><small>{item.type === 'table' ? 'جدول' : item.type === 'text' ? 'متن' : 'جزء'}</small></button>)}</div></aside>
      <main className="designer-stage-wrap"><div className="designer-stage-toolbar"><span><FiMove/> بوم طراحی</span><label><input type="checkbox" checked={showGrid} onChange={event => setShowGrid(event.target.checked)}/> شبکه</label><label><input type="checkbox" checked={previewMode} onChange={event => setPreviewMode(event.target.checked)}/> پیش‌نمایش چاپ</label><span>{drag ? 'در حال هم‌ترازی…' : 'اجزا را بکشید؛ خطوط هم‌ترازی ظاهر می‌شوند'}</span></div><div className="designer-stage-scroll"><div ref={stageRef} className={`designer-page ${isThermal ? 'thermal' : ''} ${template.orientation === 'landscape' ? 'landscape' : ''} ${showGrid && !previewMode ? 'with-grid' : ''} ${previewMode ? 'print-preview-mode' : ''}`} style={{ width: `${zoom * (isThermal ? 2.7 : template.orientation === 'landscape' ? 7.4 : 6.8)}px`, backgroundColor: pageBackground }} onPointerMove={moveDrag} onPointerUp={() => { setDrag(null); setSnapGuides({ x: null, y: null }) }} onPointerCancel={() => { setDrag(null); setSnapGuides({ x: null, y: null }) }} onClick={() => setSelectedId(null)}>
        {snapGuides.x !== null && <span className="designer-snap-guide vertical" style={{ left: `${snapGuides.x}%` }}/>}{snapGuides.y !== null && <span className="designer-snap-guide horizontal" style={{ top: `${snapGuides.y}%` }}/>}
        {elements.map(item => <div key={item.id} role="button" tabIndex={0} aria-label={item.label} onClick={event => { event.stopPropagation(); setSelectedId(item.id) }} onPointerDown={event => startDrag(event, item)} className={`designer-canvas-element ${selectedId === item.id && !previewMode ? 'selected' : ''} ${item.type === 'field' && !samplePrintValues[item.binding] ? 'missing-field' : ''} kind-${item.type}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: item.h ? `${item.h}%` : undefined, fontSize: `${item.fontSize}px`, fontFamily: item.fontFamily || 'Vazirmatn', textAlign: item.align, color: item.color, fontWeight: item.bold ? 700 : 400, backgroundColor: item.background || 'transparent', border: item.borderWidth ? `${item.borderWidth}px solid ${item.borderColor || '#cbd5e1'}` : undefined, borderRadius: item.radius ? `${item.radius}px` : undefined, boxShadow: item.shadow ? '0 2px 10px rgba(15,23,42,.18)' : undefined }} title={`${item.label} · برای جابه‌جایی بکشید`}>{renderCanvasElement(item)}{selectedId === item.id && !previewMode && <span className="designer-selection-tag">{item.label}</span>}</div>)}
      </div></div><div className="designer-stage-status"><span>عرض چاپ: {template.size}</span><span>{template.orientation === 'portrait' ? 'عمودی' : 'افقی'}</span><span>نمونهٔ داده برای پیش‌نمایش</span></div></main>
      <PrintDesignerInspector selected={selected} onChange={patchElement} onDelete={() => { persistElements(elements.filter(item => item.id !== selectedId)); setSelectedId(null) }} onDuplicate={duplicateSelected} onReorder={reorderSelected}/>
    </div>
  </section></div>
}

function PrintDesignerInspector({ selected, onChange, onDelete, onDuplicate, onReorder }) {
  const columns = selected?.columns || (selected?.type === 'table' ? [{ id: 'name', label: 'شرح کالا', binding: 'items.name' }, { id: 'quantity', label: 'تعداد', binding: 'items.quantity' }, { id: 'amount', label: 'مبلغ', binding: 'items.amount' }] : [])
  const patchColumn = (id, key, value) => onChange('columns', columns.map(column => column.id === id ? { ...column, [key]: value } : column))
  const addColumn = () => onChange('columns', [...columns, { id: `column-${Date.now()}`, label: 'ستون جدید', binding: '' }])
  const moveColumn = (index, step) => {
    const target = index + step
    if (target < 0 || target >= columns.length) return
    const next = [...columns]; [next[index], next[target]] = [next[target], next[index]]; onChange('columns', next)
  }
  return <aside className="designer-inspector">
    <div className="designer-side-heading"><strong>ویژگی‌ها</strong><small>{selected ? selected.label : 'صفحهٔ چاپ'}</small></div>
    {selected ? <>
      <div className="designer-inspector-actions"><button type="button" title="تکرار جزء" onClick={onDuplicate}>تکرار</button><button type="button" title="یک لایه بالاتر" onClick={() => onReorder(1)}>بالا</button><button type="button" title="یک لایه پایین‌تر" onClick={() => onReorder(-1)}>پایین</button><button type="button" className="danger" title="حذف جزء" onClick={onDelete}><FiTrash2/></button></div>
      <label className="designer-inspector-field"><span>{selected.type === 'field' ? 'لیبل / عنوان نمایشی' : 'متن / عنوان'}</span><textarea rows="2" value={selected.value || ''} onChange={event => onChange('value', event.target.value)}/></label>
      {selected.type === 'field' && <div className="designer-binding-box"><label className="designer-inspector-field"><span>فیلد متصل از سند</span><SearchableSelect value={selected.binding || ''} options={printFieldOptions} onChange={value => onChange('binding', value)} placeholder="فیلد را جست‌وجو و انتخاب کنید"/></label><small>اگر این داده در سند موجود نباشد، در چاپ خالی می‌ماند.</small></div>}
      {selected.type === 'table' && <section className="designer-columns-editor"><div className="designer-columns-heading"><strong>ستون‌های جدول</strong><button type="button" onClick={addColumn}><FiPlus/> افزودن ستون</button></div>{columns.map((column, index) => <div className="designer-column-card" key={column.id}><div className="designer-column-title"><strong>ستون {new Intl.NumberFormat('fa-IR').format(index + 1)}</strong><span><button type="button" onClick={() => moveColumn(index, -1)} title="جابجایی به راست">←</button><button type="button" onClick={() => moveColumn(index, 1)} title="جابجایی به چپ">→</button><button type="button" className="danger" onClick={() => onChange('columns', columns.filter(item => item.id !== column.id))} title="حذف ستون"><FiX/></button></span></div><label className="designer-inspector-field"><span>عنوان ستون</span><input value={column.label} onChange={event => patchColumn(column.id, 'label', event.target.value)}/></label><label className="designer-inspector-field"><span>دادهٔ هر ردیف</span><SearchableSelect value={column.binding || ''} options={printFieldOptions.filter(item => item.id.startsWith('items.'))} onChange={value => patchColumn(column.id, 'binding', value)} placeholder="فیلد کالا را جست‌وجو کنید"/></label></div>)}</section>}
      <div className="designer-inspector-grid"><label className="designer-inspector-field"><span>موقعیت افقی ٪</span><input type="number" min="0" max="100" value={selected.x} onChange={event => onChange('x', Number(event.target.value))}/></label><label className="designer-inspector-field"><span>موقعیت عمودی ٪</span><input type="number" min="0" max="100" value={selected.y} onChange={event => onChange('y', Number(event.target.value))}/></label><label className="designer-inspector-field"><span>عرض ٪</span><input type="number" min="5" max="100" value={selected.w} onChange={event => onChange('w', Number(event.target.value))}/></label><label className="designer-inspector-field"><span>اندازهٔ قلم</span><input type="number" min="7" max="32" value={selected.fontSize} onChange={event => onChange('fontSize', Number(event.target.value))}/></label></div>
      <div className="designer-inspector-grid"><label className="designer-inspector-field"><span>تراز متن</span><SearchableSelect value={selected.align} onChange={event => onChange('align', event.target.value)}><option value="right">راست</option><option value="center">وسط</option><option value="left">چپ</option></SearchableSelect></label><label className="designer-inspector-field"><span>رنگ متن</span><input type="color" value={selected.color || '#27364a'} onChange={event => onChange('color', event.target.value)}/></label><label className="designer-inspector-field"><span>پس‌زمینه</span><input type="color" value={selected.background && selected.background !== 'transparent' ? selected.background : '#ffffff'} onChange={event => onChange('background', event.target.value)}/></label><label className="designer-inspector-field"><span>رنگ حاشیه</span><input type="color" value={selected.borderColor || '#cbd5e1'} onChange={event => onChange('borderColor', event.target.value)}/></label><label className="designer-inspector-field"><span>ضخامت حاشیه px</span><input type="number" min="0" max="8" value={selected.borderWidth || 0} onChange={event => onChange('borderWidth', Number(event.target.value))}/></label><label className="designer-inspector-field"><span>گردی گوشه px</span><input type="number" min="0" max="32" value={selected.radius || 0} onChange={event => onChange('radius', Number(event.target.value))}/></label></div>
      <label className="designer-bold-toggle"><input type="checkbox" checked={selected.bold} onChange={event => onChange('bold', event.target.checked)}/> ضخیم‌کردن نوشته</label><label className="designer-bold-toggle"><input type="checkbox" checked={Boolean(selected.shadow)} onChange={event => onChange('shadow', event.target.checked)}/> سایهٔ جعبه</label>
      <div className="designer-inspector-help"><FiInfo/> برای هم‌ترازی دقیق، جزء را بکشید تا خطوط راهنما ظاهر شوند. اگر فیلد پویا داده نداشته باشد در چاپ خالی است.</div>
    </> : <div className="designer-empty-selection"><FiMove/><strong>یک جزء را انتخاب کنید</strong><span>برای تنظیم ویژگی‌ها، یک جزء روی بوم یا در فهرست لایه‌ها انتخاب کنید.</span></div>}
    <div className="designer-inspector-foot">تغییرها فعلاً در همین صفحه نگه‌داری می‌شوند و به سرور ذخیره نمی‌شوند.</div>
  </aside>
}

function FinanceSettingsDraft() {
  const user = useSelector(state => state.session.user)
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const permissions = user?.permissions || []
  const canRead = isAdmin || permissions.includes('settings.finance.read')
  const canUpdate = isAdmin || permissions.includes('settings.finance.update')
  const queryClient = useQueryClient()
  const defaults = { fiscalStart: null, fiscalEnd: null, baseCurrency: 'IRR', enabledCurrencies: ['USD', 'EUR', 'AED'], exchangeRateMode: 'manual', settlementCurrency: 'IRR', displayUnit: 'rial', allowClosedPeriodPosting: false, autoCreateDraftJournal: true }
  const [settings, setSettings] = useState(defaults)
  const query = useQuery({ queryKey: ['settings', 'finance'], queryFn: async () => unwrap(await api.get('/settings/finance')), enabled: canRead })
  const mutation = useMutation({
    mutationFn: async payload => unwrap(await api.put('/settings/finance', payload)),
    onSuccess: data => { queryClient.setQueryData(['settings', 'finance'], data); setSettings({ ...defaults, ...data }); toast.success('تنظیمات مالی ذخیره شد') },
    onError: error => toast.error(getErrorMessage(error)),
  })
  useEffect(() => { if (query.data) setSettings({ ...defaults, ...query.data }) }, [query.data])
  const currencyInfo = { USD: 'دلار آمریکا؛ نرخ این ارز هنگام ثبت هر سند به‌صورت دستی وارد می‌شود.', EUR: 'یورو؛ نرخ این ارز هنگام ثبت هر سند به‌صورت دستی وارد می‌شود.', AED: 'درهم امارات؛ نرخ این ارز هنگام ثبت هر سند به‌صورت دستی وارد می‌شود.' }
  const toggleCurrency = code => setSettings(current => ({ ...current, enabledCurrencies: current.enabledCurrencies.includes(code) ? current.enabledCurrencies.filter(item => item !== code) : [...current.enabledCurrencies, code] }))
  const setField = (field, value) => setSettings(current => ({ ...current, [field]: value }))
  const submit = event => {
    event.preventDefault()
    mutation.mutate({ ...settings, fiscalStart: settings.fiscalStart || null, fiscalEnd: settings.fiscalEnd || null })
  }

  if (!canRead) return <div className="error-state settings-access-error"><FiShield/><strong>مجوز مشاهدهٔ تنظیمات مالی را ندارید.</strong></div>
  if (query.isLoading) return <div className="loading-line" />
  if (query.isError) return <div className="error-state"><FiInfo/><strong>دریافت تنظیمات مالی انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button type="button" className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div>

  return <form className="finance-settings-draft" onSubmit={submit}>
    <div className="settings-coming-soon finance-settings-notice"><FiInfo/><span>واحد پول پایه و تسویهٔ خزانه بر اساس سیاست سامانه ثابت‌اند. تغییر سایر گزینه‌ها پس از ذخیره در پایگاه داده باقی می‌ماند.</span></div>

    <section className="finance-settings-section">
      <div className="finance-section-heading"><div><h3>دورهٔ مالی</h3><p>تاریخ شروع و پایان دورهٔ مالی را ثبت کنید؛ این تاریخ‌ها در این مرحله ذخیره می‌شوند.</p></div></div>
      <div className="finance-settings-grid">
        <label className="form-field"><span className="finance-label">شروع دورهٔ مالی <SettingInfo text="تاریخ آغاز دوره را با تقویم شمسی انتخاب کنید. اعتبارسنجی تاریخ اسناد نسبت به این بازه هنوز به گردش اسناد وصل نشده است."/></span><JalaliDateInput value={settings.fiscalStart || ''} onChange={value => setField('fiscalStart', value)} aria-label="شروع دوره مالی" disabled={!canUpdate}/></label>
        <label className="form-field"><span className="finance-label">پایان دورهٔ مالی <SettingInfo text="تاریخ پایان دوره را با تقویم شمسی انتخاب کنید؛ در صورت تعیین هر دو تاریخ، پایان باید پس از شروع باشد."/></span><JalaliDateInput value={settings.fiscalEnd || ''} onChange={value => setField('fiscalEnd', value)} aria-label="پایان دوره مالی" disabled={!canUpdate}/></label>
      </div>
      <FinanceToggle title="اجازهٔ ثبت در دورهٔ بسته" info="این سیاست در پایگاه داده ذخیره می‌شود. تا زمانی که کنترل دوره‌های بسته در گردش ثبت اسناد پیاده‌سازی نشود، رفتار ثبت سند را تغییر نمی‌دهد." checked={settings.allowClosedPeriodPosting} disabled={!canUpdate} onChange={value => setField('allowClosedPeriodPosting', value)}/>
    </section>

    <section className="finance-settings-section">
      <div className="finance-section-heading"><div><h3>ارزها و نمایش مبالغ</h3><p>ریال مبنای ثبت حسابداری و تسویهٔ خزانه در سامانه است.</p></div></div>
      <div className="finance-settings-grid">
        <div className="finance-setting-card"><div className="finance-setting-title"><strong>واحد پول پایه</strong><SettingInfo text="واحد مبنای نگهداری مانده‌ها و محاسبات حسابداری است. طبق تصمیم فعلی، واحد پایهٔ سامانه ریال است."/></div><div className="finance-fixed-value"><span>ریال</span><small>ثابت سامانه</small></div></div>
        <div className="finance-setting-card"><div className="finance-setting-title"><strong>واحد تسویهٔ خزانه</strong><SettingInfo text="دریافت‌ها و پرداخت‌های صندوق و بانک در نهایت به ریال ثبت و تسویه می‌شوند."/></div><div className="finance-fixed-value"><span>ریال</span><small>ثابت سامانه</small></div></div>
      </div>
      <div className="finance-setting-card finance-currency-card">
        <div className="finance-setting-title"><strong>ارزهای مجاز برای اسناد</strong><SettingInfo text="با فعال‌کردن ارز، می‌توان سند تجاری را با آن ارز ثبت کرد. مبلغ معادل ریالی با نرخ دستی همان سند محاسبه می‌شود."/></div>
        <div className="finance-currency-options">{Object.entries(currencyInfo).map(([code, info]) => <label className={`finance-currency-option${!canUpdate ? ' disabled' : ''}`} key={code}><input type="checkbox" disabled={!canUpdate} checked={settings.enabledCurrencies.includes(code)} onChange={() => toggleCurrency(code)}/><span><strong>{code}</strong><small>{code === 'USD' ? 'دلار آمریکا' : code === 'EUR' ? 'یورو' : 'درهم امارات'}</small></span><SettingInfo text={info}/></label>)}</div>
        <div className="finance-inline-help"><SettingInfo text="نرخ ارز از یک منبع بیرونی دریافت نمی‌شود و کاربر آن را برای هر سند وارد می‌کند."/> نرخ تبدیل به‌صورت دستی در هر سند تعیین می‌شود.</div>
      </div>
      <div className="finance-setting-card finance-display-card">
        <div><div className="finance-setting-title"><strong>ترجیح واحد نمایش مبلغ</strong><SettingInfo text="این ترجیح ذخیره می‌شود؛ اعمال سراسری ریال یا تومان در همهٔ فهرست‌ها و گزارش‌ها هنوز به این گزینه متصل نشده است. مقدار پایه همچنان ریال است."/></div><p>واحد ترجیحی نمایش مبالغ را انتخاب کنید.</p></div>
        <div className="tax-segmented finance-segmented"><button type="button" disabled={!canUpdate} className={settings.displayUnit === 'rial' ? 'active' : ''} aria-pressed={settings.displayUnit === 'rial'} onClick={() => setField('displayUnit', 'rial')}>ریال</button><button type="button" disabled={!canUpdate} className={settings.displayUnit === 'toman' ? 'active' : ''} aria-pressed={settings.displayUnit === 'toman'} onClick={() => setField('displayUnit', 'toman')}>تومان</button></div>
      </div>
      <div className="finance-setting-card finance-format-note"><div className="finance-setting-title"><strong>قالب نمایش عدد</strong><SettingInfo text="جداکنندهٔ سه‌رقمی خواندن مبلغ را آسان می‌کند و رقم‌ها با قالب فارسی نمایش داده می‌شوند."/></div><span>رقم‌های فارسی · جداکنندهٔ سه‌رقمی</span></div>
    </section>

    <section className="finance-settings-section">
      <div className="finance-section-heading"><div><h3>ثبت حسابداری</h3><p>رفتار سامانه هنگام تأیید اسناد عملیاتی را تعیین کنید.</p></div></div>
      <FinanceToggle title="ایجاد خودکار پیش‌نویس سند حسابداری" info="این سیاست در پایگاه داده ذخیره می‌شود؛ گردش فعلی اسناد هنوز ایجاد خودکار پیش‌نویس را از این گزینه نمی‌خواند. این گزینه به‌تنهایی پرداخت بانکی انجام نمی‌دهد." checked={settings.autoCreateDraftJournal} disabled={!canUpdate} onChange={value => setField('autoCreateDraftJournal', value)}/>
    </section>

    <footer className="finance-settings-footer"><span><FiInfo/> دورهٔ مالی اختیاری است؛ تاریخ‌ها باید به ترتیب باشند. نرخ ارز همچنان دستی و به‌ازای هر سند ثبت می‌شود.</span>{canUpdate && <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? <span className="spinner"/> : <FiCheck/>} ذخیرهٔ تنظیمات مالی</button>}</footer>
  </form>
}

function SettingInfo({ text }) {
  return <details className="setting-info"><summary aria-label="توضیحات این تنظیم" title="توضیحات"><FiInfo/></summary><span className="setting-info-tooltip" role="tooltip">{text}</span></details>
}

function FinanceToggle({ title, info, checked, disabled = false, onChange }) {
  return <div className="finance-toggle-row"><div className="finance-setting-title"><strong>{title}</strong><SettingInfo text={info}/></div><button type="button" role="switch" disabled={disabled} aria-checked={checked} className={`finance-switch${checked ? ' active' : ''}`} onClick={() => onChange(!checked)}><span/></button></div>
}

function CompanyGeneralSettings() {
  const user = useSelector(state => state.session.user)
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const permissions = user?.permissions || []
  const canRead = isAdmin || permissions.includes('settings.general.read')
  const canUpdate = isAdmin || permissions.includes('settings.general.update')
  const queryClient = useQueryClient()
  const [company, setCompany] = useState(emptyCompany)
  const [mediaBusy, setMediaBusy] = useState('')
  const query = useQuery({ queryKey: ['settings', 'general'], queryFn: async () => unwrap(await api.get('/settings/general')), enabled: canRead })
  useEffect(() => {
    if (!query.data) return
    setCompany({ ...emptyCompany, ...query.data,
      phoneNumbers: query.data.phoneNumbers || [], mobileNumbers: query.data.mobileNumbers || [],
      departmentEmails: query.data.departmentEmails || [], socialAccounts: query.data.socialAccounts || [], addresses: query.data.addresses || [],
    })
  }, [query.data])
  const save = useMutation({
    mutationFn: async payload => unwrap(await api.put('/settings/general', payload)),
    onSuccess: data => { queryClient.setQueryData(['settings', 'general'], data); setCompany(current => ({ ...current, ...data })); toast.success('اطلاعات عمومی شرکت ذخیره شد') },
    onError: error => toast.error(getErrorMessage(error)),
  })
  const setField = (field, value) => setCompany(current => ({ ...current, [field]: value }))
  const setRow = (field, index, key, value) => setCompany(current => ({ ...current, [field]: current[field].map((row, i) => i === index ? { ...row, [key]: value } : row) }))
  const addRow = (field, factory) => setCompany(current => ({ ...current, [field]: [...current[field], factory()] }))
  const removeRow = (field, index) => setCompany(current => ({ ...current, [field]: current[field].filter((_, i) => i !== index) }))
  const nonEmptyRows = field => (company[field] || []).filter(row => Object.values(row).some(value => String(value ?? '').trim()))
  const submit = event => {
    event.preventDefault()
    const payload = { ...company, phoneNumbers: nonEmptyRows('phoneNumbers'), mobileNumbers: nonEmptyRows('mobileNumbers'), departmentEmails: nonEmptyRows('departmentEmails'), socialAccounts: nonEmptyRows('socialAccounts'), addresses: nonEmptyRows('addresses') }
    payload.addresses = payload.addresses.map(address => ({ ...address, latitude: address.latitude === '' || address.latitude == null ? null : Number(address.latitude), longitude: address.longitude === '' || address.longitude == null ? null : Number(address.longitude) }))
    save.mutate(payload)
  }
  const uploadMedia = async (kind, file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error('فقط تصویر JPG یا PNG تا حداکثر ۵ مگابایت پذیرفته می‌شود'); return }
    setMediaBusy(kind)
    try {
      const data = unwrap(await api.post(`/settings/general/media/${kind}`, (() => { const form = new FormData(); form.append('image', file); return form })(), { headers: { 'Content-Type': 'multipart/form-data' } }))
      queryClient.setQueryData(['settings', 'general'], data); setCompany(current => ({ ...current, ...data })); toast.success(kind === 'logo' ? 'لوگوی شرکت بارگذاری شد' : 'مهر شرکت بارگذاری شد')
    } catch (error) { toast.error(getErrorMessage(error)) } finally { setMediaBusy('') }
  }
  const clearMedia = async kind => {
    if (!window.confirm(kind === 'logo' ? 'لوگوی شرکت حذف شود؟' : 'تصویر مهر شرکت حذف شود؟')) return
    setMediaBusy(kind)
    try { const data = unwrap(await api.delete(`/settings/general/media/${kind}`)); queryClient.setQueryData(['settings', 'general'], data); setCompany(current => ({ ...current, ...data })); toast.success('تصویر حذف شد') }
    catch (error) { toast.error(getErrorMessage(error)) } finally { setMediaBusy('') }
  }

  if (!canRead) return <div className="error-state settings-access-error"><FiShield/><strong>مجوز مشاهدهٔ اطلاعات عمومی شرکت را ندارید.</strong></div>
  if (query.isLoading) return <div className="loading-line" />
  if (query.isError) return <div className="error-state"><FiInfo/><strong>دریافت تنظیمات شرکت انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button type="button" className="btn btn-secondary" onClick={() => query.refetch()}>تلاش دوباره</button></div>

  return <form className="company-settings-form" onSubmit={submit}>
    <section className="company-settings-section"><div className="company-settings-section-heading"><div><h3>مشخصات شرکت</h3><p>همهٔ موارد این بخش اختیاری‌اند.</p></div></div>
      <div className="company-settings-grid">
        <TextField label="نام نمایشی شرکت" value={company.displayName} disabled={!canUpdate} onChange={value => setField('displayName', value)} />
        <TextField label="نام کامل ثبتی" value={company.legalName} disabled={!canUpdate} onChange={value => setField('legalName', value)} />
        <TextField label="نام تجاری یا برند" value={company.tradeName} disabled={!canUpdate} onChange={value => setField('tradeName', value)} />
        <TextField label="نوع شخصیت حقوقی" placeholder="مثلاً سهامی خاص" value={company.legalForm} disabled={!canUpdate} onChange={value => setField('legalForm', value)} />
        <TextField label="شناسهٔ ملی" value={company.nationalId} disabled={!canUpdate} onChange={value => setField('nationalId', value)} />
        <TextField label="شمارهٔ اقتصادی" value={company.economicNumber} disabled={!canUpdate} onChange={value => setField('economicNumber', value)} />
        <TextField label="شمارهٔ ثبت" value={company.registrationNumber} disabled={!canUpdate} onChange={value => setField('registrationNumber', value)} />
      </div>
    </section>
    <section className="company-settings-section"><SectionHeading title="راه‌های تماس" action={canUpdate ? <AddButton onClick={() => addRow('phoneNumbers', newPhone)} label="افزودن تلفن"/> : null}/>
      {company.phoneNumbers.map((row, index) => <div className="company-settings-row" key={`phone-${index}`}><TextField label="عنوان یا واحد" value={row.label} disabled={!canUpdate} onChange={value => setRow('phoneNumbers', index, 'label', value)}/><TextField label="شماره تلفن" value={row.number} disabled={!canUpdate} onChange={value => setRow('phoneNumbers', index, 'number', value)}/><TextField label="داخلی" value={row.extension} disabled={!canUpdate} onChange={value => setRow('phoneNumbers', index, 'extension', value)}/>{canUpdate && <RemoveButton onClick={() => removeRow('phoneNumbers', index)}/>}</div>)}
      {!company.phoneNumbers.length && <div className="company-settings-hint">تلفنی ثبت نشده است.</div>}
      <SectionHeading title="شماره‌های موبایل" action={canUpdate ? <AddButton onClick={() => addRow('mobileNumbers', newMobile)} label="افزودن موبایل"/> : null}/>
      {company.mobileNumbers.map((row, index) => <div className="company-settings-row two-fields" key={`mobile-${index}`}><TextField label="عنوان یا واحد" value={row.label} disabled={!canUpdate} onChange={value => setRow('mobileNumbers', index, 'label', value)}/><TextField label="شماره موبایل" value={row.number} disabled={!canUpdate} onChange={value => setRow('mobileNumbers', index, 'number', value)}/>{canUpdate && <RemoveButton onClick={() => removeRow('mobileNumbers', index)}/>}</div>)}
      <div className="company-settings-grid company-settings-contact-main"><TextField label="ایمیل عمومی" type="email" value={company.email} disabled={!canUpdate} onChange={value => setField('email', value)}/><TextField label="وب‌سایت" type="url" placeholder="https://" value={company.website} disabled={!canUpdate} onChange={value => setField('website', value)}/></div>
      <SectionHeading title="ایمیل واحدها" action={canUpdate ? <AddButton onClick={() => addRow('departmentEmails', newDepartmentEmail)} label="افزودن ایمیل واحد"/> : null}/>
      {company.departmentEmails.map((row, index) => <div className="company-settings-row two-fields" key={`email-${index}`}><TextField label="واحد" value={row.label} disabled={!canUpdate} onChange={value => setRow('departmentEmails', index, 'label', value)}/><TextField label="ایمیل" type="email" value={row.email} disabled={!canUpdate} onChange={value => setRow('departmentEmails', index, 'email', value)}/>{canUpdate && <RemoveButton onClick={() => removeRow('departmentEmails', index)}/>}</div>)}
    </section>
    <section className="company-settings-section"><SectionHeading title="حساب‌های شبکه‌های اجتماعی" action={canUpdate ? <AddButton onClick={() => addRow('socialAccounts', newSocial)} label="افزودن حساب"/> : null}/>
      <p className="company-settings-help">شناسه یا لینک هر شبکه را وارد کنید؛ همهٔ فیلدها اختیاری‌اند.</p>
      {company.socialAccounts.map((row, index) => <div className="company-settings-row social-row" key={`social-${index}`}><TextField label="پلتفرم" placeholder="اینستاگرام، تلگرام، واتساپ، بله…" value={row.platform} disabled={!canUpdate} onChange={value => setRow('socialAccounts', index, 'platform', value)}/><TextField label="عنوان" placeholder="پشتیبانی" value={row.label} disabled={!canUpdate} onChange={value => setRow('socialAccounts', index, 'label', value)}/><TextField label="شناسه" value={row.handle} disabled={!canUpdate} onChange={value => setRow('socialAccounts', index, 'handle', value)}/><TextField label="لینک صفحه یا گفتگو" type="url" value={row.url} disabled={!canUpdate} onChange={value => setRow('socialAccounts', index, 'url', value)}/>{canUpdate && <RemoveButton onClick={() => removeRow('socialAccounts', index)}/>}</div>)}
      {!company.socialAccounts.length && <div className="company-settings-hint">هنوز حسابی اضافه نشده است.</div>}
    </section>
    <section className="company-settings-section"><SectionHeading title="نشانی‌های شرکت" action={canUpdate ? <AddButton onClick={() => addRow('addresses', newAddress)} label="افزودن نشانی"/> : null}/>
      {company.addresses.map((row, index) => <div className="company-address-card" key={`address-${index}`}><div className="company-settings-grid"><TextField label="عنوان محل" placeholder="دفتر مرکزی، کارخانه…" value={row.label} disabled={!canUpdate} onChange={value => setRow('addresses', index, 'label', value)}/><TextField label="استان" value={row.province} disabled={!canUpdate} onChange={value => setRow('addresses', index, 'province', value)}/><TextField label="شهر" value={row.city} disabled={!canUpdate} onChange={value => setRow('addresses', index, 'city', value)}/><TextField label="کد پستی" value={row.postalCode} disabled={!canUpdate} onChange={value => setRow('addresses', index, 'postalCode', value)}/><TextField label="لینک موقعیت روی نقشه" type="url" value={row.mapUrl} disabled={!canUpdate} onChange={value => setRow('addresses', index, 'mapUrl', value)}/><TextField label="عرض جغرافیایی" inputMode="decimal" value={row.latitude ?? ''} disabled={!canUpdate} onChange={value => setRow('addresses', index, 'latitude', value)}/><TextField label="طول جغرافیایی" inputMode="decimal" value={row.longitude ?? ''} disabled={!canUpdate} onChange={value => setRow('addresses', index, 'longitude', value)}/><label className="form-field company-address-full"><span>نشانی پستی</span><textarea className="form-control" rows="2" value={row.address} disabled={!canUpdate} onChange={event => setRow('addresses', index, 'address', event.target.value)}/></label></div>{canUpdate && <RemoveButton onClick={() => removeRow('addresses', index)}/>}</div>)}
      {!company.addresses.length && <div className="company-settings-hint">نشانی‌ای ثبت نشده است.</div>}
    </section>
    <section className="company-settings-section"><h3>مشخصات امضاکننده</h3><div className="company-settings-grid"><TextField label="نام امضاکنندهٔ مجاز" value={company.signatoryName} disabled={!canUpdate} onChange={value => setField('signatoryName', value)}/><TextField label="سمت" value={company.signatoryTitle} disabled={!canUpdate} onChange={value => setField('signatoryTitle', value)}/></div></section>
    <section className="company-settings-section"><h3>لوگو و مهر</h3><p className="company-settings-help">فایل‌ها به‌صورت خصوصی ذخیره می‌شوند و فقط کاربران دارای دسترسی این بخش می‌توانند آن‌ها را ببینند.</p><div className="company-settings-media-grid"><PrivateImageField label="لوگوی شرکت" kind="logo" path={company.logoPath} disabled={!canUpdate || Boolean(mediaBusy)} busy={mediaBusy === 'logo'} onUpload={file => uploadMedia('logo', file)} onRemove={() => clearMedia('logo')}/><PrivateImageField label="تصویر مهر شرکت" kind="stamp" path={company.stampPath} disabled={!canUpdate || Boolean(mediaBusy)} busy={mediaBusy === 'stamp'} onUpload={file => uploadMedia('stamp', file)} onRemove={() => clearMedia('stamp')}/></div></section>
    <footer className="company-settings-footer"><span><FiInfo/> فیلدها اجباری نیستند؛ فقط اطلاعاتی را وارد کنید که برای شرکت شما کاربرد دارد.</span>{canUpdate && <button className="btn btn-primary" type="submit" disabled={save.isPending || Boolean(mediaBusy)}>{save.isPending ? <span className="spinner"/> : <FiCheck/>} ذخیرهٔ اطلاعات عمومی</button>}</footer>
  </form>
}

function TextField({ label, value, onChange, type = 'text', placeholder = '', disabled = false, inputMode }) {
  return <label className="form-field"><span>{label}</span><input className="form-control" type={type} inputMode={inputMode} value={value ?? ''} placeholder={placeholder} disabled={disabled} onChange={event => onChange(event.target.value)}/></label>
}
function SectionHeading({ title, action }) { return <div className="company-settings-section-heading"><div><h3>{title}</h3></div>{action}</div> }
function AddButton({ onClick, label }) { return <button type="button" className="btn btn-secondary company-settings-add" onClick={onClick}><FiPlus/>{label}</button> }
function RemoveButton({ onClick }) { return <button type="button" className="icon-button danger company-settings-remove" aria-label="حذف ردیف" title="حذف ردیف" onClick={onClick}><FiTrash2/></button> }

function PrivateImageField({ label, kind, path, disabled, busy, onUpload, onRemove }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    let objectUrl
    let active = true
    setPreview('')
    if (path) api.get(path, { responseType: 'blob' }).then(response => {
      objectUrl = URL.createObjectURL(response.data)
      if (active) setPreview(objectUrl)
      else URL.revokeObjectURL(objectUrl)
    }).catch(() => { if (active) setPreview('') })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [path])
  return <div className="company-media-field"><div className="company-media-preview">{preview ? <img src={preview} alt={label}/> : <span>{kind === 'logo' ? 'بدون لوگو' : 'بدون تصویر مهر'}</span>}</div><div className="company-media-controls"><strong>{label}</strong><small>JPG یا PNG · حداکثر ۵ مگابایت</small><div><label className="btn btn-secondary company-media-pick"><FiUpload/>{path ? 'جایگزینی تصویر' : 'انتخاب تصویر'}<input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={disabled} onChange={event => { onUpload(event.target.files?.[0]); event.target.value = '' }}/></label>{path && <button type="button" className="btn btn-secondary" disabled={disabled || busy} onClick={onRemove}><FiX/> حذف</button>}{busy && <span className="spinner"/>}</div></div></div>
}
