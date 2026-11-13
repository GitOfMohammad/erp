import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiClock, FiRefreshCw, FiSearch, FiServer, FiShield } from 'react-icons/fi'
import { api, getErrorMessage, unwrap } from '../services/api'
import { formatPersianDate } from '../utils/persianDate'
import './LogDashboardPage.css'

const fa = value => new Intl.NumberFormat('fa-IR').format(Number(value || 0))
const eventLabels = { LOGIN_SUCCESS: 'ورود موفق', LOGIN_FAILED: 'تلاش ورود ناموفق', LOGOUT: 'خروج از سامانه', PASSWORD_CHANGED: 'تغییر رمز عبور', ADMIN_PASSWORD_RESET: 'بازنشانی رمز توسط مدیر', USER_DISABLED: 'غیرفعال‌شدن کاربر', USER_ENABLED: 'فعال‌شدن کاربر', USER_ROLE_CHANGED: 'تغییر نقش کاربر' }

export default function LogDashboardPage() {
  const user = useSelector(state => state.session.user)
  const isSuperAdmin = user?.rolename?.toLocaleLowerCase('fa') === 'مدیر سایت'
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [method, setMethod] = useState('all')
  const [page, setPage] = useState(1)
  useEffect(() => { const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, 350); return () => clearTimeout(timer) }, [searchInput])
  const query = useQuery({
    queryKey: ['log-dashboard', { search, status, method, page }],
    queryFn: async () => unwrap(await api.get('/logs', { params: { search, status, method, page, limit: 50 } })),
    enabled: isSuperAdmin,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  })
  if (!isSuperAdmin) return <Navigate to="/" replace />
  const data = query.data
  const summary = data?.summary || {}
  const refresh = () => query.refetch()

  return <section className="log-dashboard-page">
    <header className="log-dashboard-heading"><div><span className="log-dashboard-eyebrow"><FiActivity/> پایش زندهٔ سامانه</span><h1>داشبورد لاگ‌ها</h1><p>درخواست‌ها، خطاها، سرعت پاسخ‌گویی و رویدادهای امنیتی سامانه را دنبال کنید.</p></div><div className="log-dashboard-heading-actions"><span className={`log-live-state${query.isError ? ' offline' : ''}`}><i/>{query.isError ? 'اختلال در دریافت داده' : 'به‌روزرسانی خودکار · هر ۳۰ ثانیه'}</span><button className="btn btn-secondary" onClick={refresh} disabled={query.isFetching}><FiRefreshCw className={query.isFetching ? 'log-spinning' : ''}/> بروزرسانی</button></div></header>

    {query.isLoading ? <div className="loading-line"/> : query.isError ? <div className="error-state"><FiAlertTriangle/><strong>دریافت لاگ‌ها انجام نشد</strong><span>{getErrorMessage(query.error)}</span><button className="btn btn-secondary" onClick={refresh}>تلاش دوباره</button></div> : <>
      <div className="log-kpi-grid">
        <article className="log-kpi-card"><span className="log-kpi-icon blue"><FiActivity/></span><div><small>درخواست‌های ۲۴ ساعت اخیر</small><strong>{fa(summary.requests24h)}</strong><em>از ابتدای بازهٔ ۲۴ ساعته</em></div></article>
        <article className="log-kpi-card"><span className="log-kpi-icon red"><FiAlertTriangle/></span><div><small>پاسخ‌های خطا در ۲۴ ساعت</small><strong>{fa(summary.errors24h)}</strong><em>{summary.requests24h ? `${fa(Math.round(summary.errors24h * 100 / summary.requests24h))}٪ از کل درخواست‌ها` : 'بدون درخواست ثبت‌شده'}</em></div></article>
        <article className="log-kpi-card"><span className="log-kpi-icon green"><FiCheckCircle/></span><div><small>درخواست‌های ۷ روز اخیر</small><strong>{fa(summary.requests7d)}</strong><em>با احتساب همهٔ پاسخ‌ها</em></div></article>
        <article className="log-kpi-card"><span className="log-kpi-icon amber"><FiClock/></span><div><small>میانگین زمان پاسخ · ۲۴ ساعت</small><strong>{fa(summary.averageDurationMs)} <small>ms</small></strong><em>زمان پردازش سمت سرور</em></div></article>
      </div>

      <div className="log-dashboard-panels">
        <section className="panel log-table-panel"><header className="log-panel-heading"><div><span className="log-panel-icon"><FiServer/></span><div><h2>درخواست‌های سامانه</h2><p>درخواست‌های API بدون ذخیرهٔ محتوای فرم یا رمزها ثبت می‌شوند.</p></div></div><span className="log-retention-note">نگهداری: ۳۰ روز</span></header>
          <div className="log-toolbar"><label className="log-search"><FiSearch/><input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="جست‌وجوی کاربر، مسیر، IP یا شناسهٔ درخواست"/></label><div className="log-filter-pills" aria-label="فیلتر وضعیت">{[['all','همه'],['errors','خطاها'],['success','موفق']].map(([value,label]) => <button key={value} className={status === value ? 'selected' : ''} onClick={() => { setStatus(value); setPage(1) }}>{label}</button>)}</div><div className="log-filter-pills log-method-pills" aria-label="فیلتر روش">{[['all','همهٔ روش‌ها'],['GET','GET'],['POST','POST'],['PUT','PUT'],['DELETE','DELETE']].map(([value,label]) => <button key={value} className={method === value ? 'selected' : ''} onClick={() => { setMethod(value); setPage(1) }}>{label}</button>)}</div></div>
          <div className="table-scroll log-table-scroll"><table className="data-table log-table"><thead><tr><th>نتیجه</th><th>روش / مسیر</th><th>کاربر</th><th>زمان پاسخ</th><th>نشانی شبکه</th><th>زمان ثبت</th></tr></thead><tbody>{data?.logs?.map(log => <tr key={log.id}><td><span className={`log-status ${log.status_code < 400 ? 'ok' : log.status_code < 500 ? 'client-error' : 'server-error'}`}>{fa(log.status_code)}</span></td><td><div className="log-route"><b>{log.method}</b><code dir="ltr">{log.path}</code><small dir="ltr">ID: {log.request_id}</small></div></td><td>{log.username || 'مهمان / نامشخص'}</td><td><span className={log.duration_ms > 1000 ? 'log-slow' : ''}>{fa(log.duration_ms)} ms</span></td><td dir="ltr">{log.ip_address || '—'}</td><td>{log.created_at ? formatPersianDate(log.created_at, true) : '—'}</td></tr>)}</tbody></table>{!data?.logs?.length && <div className="log-empty">در این بازه درخواستی مطابق فیلترها پیدا نشد.</div>}</div>
          <footer className="log-pagination"><span>{fa(data?.total)} درخواست در ۷ روز اخیر</span><div><button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(value => Math.max(1,value - 1))}>صفحهٔ قبل</button><span>صفحهٔ {fa(data?.page)} از {fa(data?.pages)}</span><button className="btn btn-secondary" disabled={page >= (data?.pages || 1)} onClick={() => setPage(value => value + 1)}>صفحهٔ بعد</button></div></footer>
        </section>

        <aside className="log-side-panels"><section className="panel log-side-panel"><header><span className="log-panel-icon"><FiActivity/></span><div><h2>مسیرهای پرترافیک</h2><p>در ۲۴ ساعت اخیر</p></div></header>{data?.topRoutes?.length ? <ol className="log-top-routes">{data.topRoutes.map((route,index) => <li key={route.path}><span className="log-route-rank">{fa(index + 1)}</span><code dir="ltr">{route.path}</code><b>{fa(route.count)}</b></li>)}</ol> : <div className="log-empty compact">داده‌ای برای نمایش نیست.</div>}</section>
          <section className="panel log-side-panel"><header><span className="log-panel-icon security"><FiShield/></span><div><h2>رویدادهای امنیتی</h2><p>آخرین ورودها و تغییرات دسترسی</p></div></header>{data?.securityEvents?.length ? <ol className="log-security-list">{data.securityEvents.map(event => <li key={event.id}><span className={`security-event-dot ${event.event_type === 'LOGIN_FAILED' ? 'failed' : ''}`}/><div><b>{eventLabels[event.event_type] || event.event_type}</b><small>{event.username || 'کاربر نامشخص'}{event.ip_address ? ` · ${event.ip_address}` : ''}</small><time>{event.created_at ? formatPersianDate(event.created_at, true) : '—'}</time></div></li>)}</ol> : <div className="log-empty compact">رویدادی ثبت نشده است.</div>}</section>
          <div className="log-privacy-note"><FiShield/><span>برای حفظ حریم خصوصی، محتوای درخواست‌ها، رمزها و توکن‌ها در لاگ ذخیره نمی‌شوند.</span></div>
        </aside>
      </div>
    </>}
  </section>
}
