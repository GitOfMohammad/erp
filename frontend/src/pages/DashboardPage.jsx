import SearchableSelect from '../components/SearchableSelect'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowDownLeft, FiArrowUpLeft, FiCalendar, FiChevronLeft, FiChevronRight, FiChevronDown, FiDownload, FiMoreHorizontal, FiPlus, FiRefreshCw, FiSearch, FiTrendingDown, FiTrendingUp, FiUsers, FiPackage, FiDollarSign, FiShoppingBag, FiCreditCard, FiActivity, FiBarChart2 } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { api, unwrap } from '../services/api'
import { formatPersianDate } from '../utils/persianDate'
import { downloadCsv } from '../utils/exportCsv'

const money = (v) => new Intl.NumberFormat('fa-IR').format(typeof v === 'bigint' ? v : Number(v || 0))
function useList(key, url) { return useQuery({ queryKey:['dashboard',key], queryFn:async()=>unwrap(await api.get(url)), retry:false }) }
const periodOptions = [
  { value: 'current-month', label: 'این ماه' },
  { value: 'previous-month', label: 'ماه قبل' },
  { value: 'last-three-months', label: 'سه ماه اخیر' },
  { value: 'current-year', label: 'امسال' },
]
function jalaliKey(date, part = 'month') {
  const pieces = new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', month: 'numeric' }).formatToParts(date)
  const year = pieces.find((piece) => piece.type === 'year')?.value
  const month = pieces.find((piece) => piece.type === 'month')?.value
  return part === 'year' ? year : `${year}-${month}`
}
function shiftDay(date, days) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12) }
function jalaliPeriodBounds(date, part = 'month') {
  const key = jalaliKey(date, part)
  let start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  let end = new Date(start)
  for (let i = 0; i < 370 && jalaliKey(shiftDay(start, -1), part) === key; i++) start = shiftDay(start, -1)
  for (let i = 0; i < 370 && jalaliKey(shiftDay(end, 1), part) === key; i++) end = shiftDay(end, 1)
  return { start, end }
}
function toApiDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function getPeriodRange(period) {
  const now = new Date()
  let { start, end } = jalaliPeriodBounds(now, period === 'current-year' ? 'year' : 'month')
  if (period === 'previous-month') ({ start, end } = jalaliPeriodBounds(shiftDay(start, -1)))
  else if (period === 'last-three-months') for (let i = 0; i < 2; i++) start = jalaliPeriodBounds(shiftDay(start, -1)).start
  return { from: toApiDate(start), to: toApiDate(end) }
}
export default function DashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const refreshDashboard = () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  const stock = useList('stock','/inventory/stock?limit=5')
  const user = useSelector((state) => state.session.user)
  const [period, setPeriod] = useState('current-month')
  const range = getPeriodRange(period)
  const canReadReport = user?.permissions?.includes('financial.reports.read') || user?.rolename?.toLowerCase() === 'مدیر سایت'
  const periodReport = useQuery({
    queryKey: ['dashboard', 'income-statement', range.from, range.to],
    queryFn: async () => unwrap(await api.get(`/financial/gl/reports/income-statement?from=${range.from}&to=${range.to}`)),
    enabled: canReadReport,
    retry: false,
  })
  const stockRows = asArray(stock.data)
  const totalStock = stockRows.reduce((s,x)=>s+Number(x.quantity||x.current_quantity||0),0)
  const exportDashboard = () => {
    downloadCsv('dashboard-summary.csv', ['شاخص', 'مقدار', 'بازه'], [
      ['درآمد دوره', canReadReport ? money(periodReport.data?.totalRevenue) : 'بدون دسترسی', `${range.from} تا ${range.to}`],
      ['هزینه دوره', canReadReport ? money(periodReport.data?.totalExpenses) : 'بدون دسترسی', `${range.from} تا ${range.to}`],
      ['سود یا زیان خالص', canReadReport ? money(periodReport.data?.netIncome) : 'بدون دسترسی', `${range.from} تا ${range.to}`],
      ['مجموع موجودی اقلام', money(totalStock), 'موجودی فعلی'],
    ])
  }
  return <div className="dashboard-page">
    <div className="page-heading"><div><div className="eyebrow">{`${new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", { weekday:"long" }).format(new Date())}، ${formatPersianDate(new Date())}`}</div><h1>روز بخیر، خوش آمدید <span className="wave">✦</span></h1><p>نمای کلی از اتفاقات و عملکرد کسب‌وکار شما.</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={exportDashboard}><FiDownload/> دریافت گزارش</button><button className="btn btn-primary" onClick={()=>location.href='/products'}><FiPlus/> محصول جدید</button></div></div>
    <div className="welcome-banner"><div className="banner-copy"><span className="banner-kicker">نمای امروز شما</span><h2>همه‌چیز در جریان است.</h2><p>وضعیت بخش‌های مختلف سازمان را از همین‌جا دنبال کنید.</p><button onClick={()=>location.href='/inventory'}>مشاهده وضعیت انبار <FiArrowUpLeft/></button></div><div className="banner-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-core"><FiActivity/></div><span className="art-chip chip-a"><FiTrendingUp/> +۱۲٫۸٪</span><span className="art-chip chip-b"><FiPackage/> موجودی</span></div><div className="banner-glow"/></div>
    <div className="section-head"><div><h2>خلاصه عملکرد</h2><p>اعداد کلیدی سامانه در یک نگاه</p></div><label className="select-button" aria-label="بازه گزارش داشبورد"><FiCalendar/><SearchableSelect value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="انتخاب بازه گزارش">{periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SearchableSelect><FiChevronDown/></label></div>
    <section className="metric-grid"><Metric icon={FiDollarSign} tone="mint" label="درآمد دوره" value={reportValue(periodReport, canReadReport, money(periodReport.data?.totalRevenue))} unit="ریال" trend="در بازه انتخابی" positive to="/journals" onRefresh={refreshDashboard}/><Metric icon={FiCreditCard} tone="lavender" label="هزینه دوره" value={reportValue(periodReport, canReadReport, money(periodReport.data?.totalExpenses))} unit="ریال" trend="در بازه انتخابی" positive={false} to="/journals" onRefresh={refreshDashboard}/><Metric icon={FiBarChart2} tone="peach" label="سود / زیان خالص" value={reportValue(periodReport, canReadReport, money(periodReport.data?.netIncome))} unit="ریال" trend="در بازه انتخابی" to="/journals" onRefresh={refreshDashboard}/><Metric icon={FiPackage} tone="blue" label="اقلام موجودی" value={money(totalStock)} unit="واحد" trend="موجودی فعلی" to="/inventory" onRefresh={refreshDashboard}/></section>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>گردش عملیات</h3><p>فعالیت خرید و فروش در بازه انتخابی</p></div><ActionMenu label="گردش عملیات" to="/journals" onRefresh={refreshDashboard}/></div><div className="chart-legend"><span><i className="legend-dot sales-dot"/> فروش</span><span><i className="legend-dot purchase-dot"/> خرید</span></div><div className="chart-area"><div className="chart-y"><span>۸۰۰</span><span>۶۰۰</span><span>۴۰۰</span><span>۲۰۰</span><span>۰</span></div><div className="chart-canvas"><div className="chart-grid-lines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 700 220" preserveAspectRatio="none" className="chart-svg"><defs><linearGradient id="fillSales" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#24b38a" stopOpacity=".22"/><stop offset="100%" stopColor="#24b38a" stopOpacity="0"/></linearGradient><linearGradient id="fillPurchase" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8087f8" stopOpacity=".18"/><stop offset="100%" stopColor="#8087f8" stopOpacity="0"/></linearGradient></defs><path d="M0 170 C50 145 70 160 115 125 S185 150 225 105 S290 125 340 92 S400 114 455 75 S520 105 570 55 S640 85 700 30 V220 H0Z" fill="url(#fillSales)"/><path d="M0 175 C55 150 75 180 120 150 S185 160 230 135 S290 155 340 120 S410 142 460 110 S520 135 575 95 S640 112 700 75 V220 H0Z" fill="url(#fillPurchase)"/><path d="M0 170 C50 145 70 160 115 125 S185 150 225 105 S290 125 340 92 S400 114 455 75 S520 105 570 55 S640 85 700 30" fill="none" stroke="#20ad84" strokeWidth="3" vectorEffect="non-scaling-stroke"/><path d="M0 175 C55 150 75 180 120 150 S185 160 230 135 S290 155 340 120 S410 142 460 110 S520 135 575 95 S640 112 700 75" fill="none" stroke="#858bf4" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg><div className="chart-x"><span>۱ مهر</span><span>۵ مهر</span><span>۱۰ مهر</span><span>۱۵ مهر</span><span>۲۰ مهر</span><span>۲۵ مهر</span><span>۳۰ مهر</span></div></div></div></section>
    <section className="panel activity-panel"><div className="panel-heading"><div><h3>آخرین فعالیت‌ها</h3><p>رویدادهای اخیر سامانه</p></div><button className="text-link">مشاهده همه <FiChevronLeft/></button></div><div className="activity-empty"><span className="empty-icon"><FiActivity/></span><strong>هنوز فعالیتی ثبت نشده</strong><p>با ثبت عملیات جدید، این بخش به‌روزرسانی می‌شود.</p></div></section></div>
    <div className="dashboard-grid bottom-grid"><section className="panel table-panel"><div className="panel-heading"><div><h3>موجودی کم</h3><p>کالاهایی که به نقطه سفارش نزدیک شده‌اند</p></div><button className="text-link" onClick={()=>location.href='/inventory'}>مشاهده همه <FiChevronLeft/></button></div>{stock.isLoading ? <div className="loading-line"/> : stockRows.length ? <div className="table-scroll"><table><thead><tr><th>نام کالا</th><th>انبار</th><th>موجودی</th><th>وضعیت</th></tr></thead><tbody>{stockRows.slice(0,5).map((r,i)=><tr key={r.id||i}><td><span className="product-cell"><i className="product-thumb"><FiPackage/></i><span><b>{r.product?.name||r.product_name||'محصول'}</b><small>{r.product?.code||r.product_code||'—'}</small></span></span></td><td>{r.warehouse?.name||r.warehouse_name||'—'}</td><td className="number-cell">{money(r.quantity||r.current_quantity)}</td><td><span className="status-pill status-green">در دسترس</span></td></tr>)}</tbody></table></div> : <EmptyState text="اطلاعات موجودی در دسترس نیست"/>}</section><section className="panel quick-panel"><div className="panel-heading"><div><h3>دسترسی سریع</h3><p>کارهای پرکاربرد خود را انجام دهید</p></div></div><div className="quick-actions"><Quick to="/products" icon={FiPackage} tone="mint" title="ثبت محصول"/><Quick to="/purchase-invoices" icon={FiArrowDownLeft} tone="lavender" title="فاکتور خرید"/><Quick to="/sales-invoices" icon={FiArrowUpLeft} tone="peach" title="فاکتور فروش"/><Quick to="/employees" icon={FiUsers} tone="blue" title="افزودن همکار"/></div></section></div>
  </div>
}
function reportValue(query, canRead, value) { if (!canRead || query.isError) return '—'; if (query.isLoading) return '…'; return value ?? '—' }
function asArray(data) { if(Array.isArray(data)) return data; for(const k of ['rows','items','results','data','records']) if(Array.isArray(data?.[k])) return data[k]; return [] }
function Metric({icon:Icon,tone,label,value,unit,trend,positive,to,onRefresh}) { return <article className="metric-card"><div className="metric-top"><span className={`metric-icon tone-${tone}`}><Icon/></span><ActionMenu label={label} to={to} onRefresh={onRefresh}/></div><span className="metric-label">{label}</span><div className="metric-value">{value} <small>{unit}</small></div><div className={`metric-trend ${positive===false?'negative':''}`}>{positive===undefined?<span className="trend-dot"/>:positive?<FiTrendingUp/>:<FiTrendingDown/>}<span>{trend}</span></div></article> }
function ActionMenu({label,to,onRefresh}) {
  const [open,setOpen] = useState(false)
  const navigate = useNavigate()
  return <div className="dashboard-action-wrap">
    <button className="icon-button" type="button" aria-label={`اقدام‌های ${label}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}><FiMoreHorizontal/></button>
    {open && <div className="dashboard-action-menu" role="menu">
      <button type="button" role="menuitem" onClick={() => { onRefresh(); setOpen(false) }}><FiRefreshCw/>به‌روزرسانی</button>
      <button type="button" role="menuitem" onClick={() => { navigate(to); setOpen(false) }}><FiChevronLeft/>مشاهده جزئیات</button>
    </div>}
  </div>
}
function Quick({to,icon:Icon,tone,title}) { return <a className="quick-action" href={to}><i className={`quick-icon tone-${tone}`}><Icon/></i><span>{title}</span><FiChevronLeft/></a> }
function EmptyState({text}) { return <div className="empty-state"><FiPackage/><span>{text}</span></div> }






