import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FiActivity, FiArchive, FiBarChart2, FiBell, FiBookOpen, FiBox, FiBriefcase, FiCalendar, FiCheckCircle, FiChevronDown, FiChevronLeft, FiClock, FiCommand, FiCreditCard, FiDollarSign, FiGitBranch, FiGrid, FiLayers, FiLogOut, FiMenu, FiMoon, FiPackage, FiSearch, FiSettings, FiShield, FiShoppingBag, FiSun, FiUsers, FiX, FiArrowUpLeft, FiHelpCircle, FiTruck, FiFileText, FiLock, FiPrinter } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, getErrorMessage } from '../services/api'
import { clearSession } from '../store/store'
import { resources } from '../utils/resources'

const iconMap = { FiGrid, FiUsers, FiPackage, FiArchive, FiShoppingBag, FiCreditCard, FiBriefcase, FiActivity, FiLayers, FiShield, FiBox, FiBarChart2, FiSettings, FiClock, FiCalendar, FiDollarSign, FiBookOpen, FiGitBranch, FiCheckCircle, FiTruck, FiFileText, FiPrinter }
const groups = [
  { title: 'نمای کلی', icon: FiGrid, slugs: [''] },
  { title: 'حسابداری', icon: FiBookOpen, slugs: ['journal-accounts', 'journals', 'assets'] },
  { title: 'خرید', icon: FiShoppingBag, slugs: ['partners', 'purchase-orders', 'purchase-invoices', 'purchase-returns', 'vendor-updates'], labels: { partners: 'تأمین‌کنندگان' } },
  { title: 'فروش', icon: FiDollarSign, slugs: ['partners', 'sales-representatives', 'sales-orders', 'sales-invoices', 'sales-returns'], labels: { partners: 'مشتریان' } },
  { title: 'انبارداری', icon: FiArchive, slugs: ['products', 'categories', 'warehouses', 'inventory', 'movements', 'transfers', 'stock-counts', 'shipments'] },
  { title: 'خزانه‌داری', icon: FiCreditCard, slugs: ['treasury', 'cash-vouchers', 'company-checkbooks', 'bank-reconciliation', 'payables'] },
  { title: 'منابع انسانی', icon: FiBriefcase, slugs: ['employees', 'departments', 'positions', 'shifts', 'shift-assignments', 'attendance', 'leaves', 'payroll', 'performance-reviews', 'trainings', 'training-enrollments'] },
  { title: 'ارتباط با مشتری', icon: FiUsers, slugs: ['leads', 'interactions', 'support-tickets', 'contracts'], labels: { contracts: 'قراردادهای مشتریان' } },
  { title: 'تولید', icon: FiGitBranch, slugs: ['boms', 'production-orders', 'quality-checks'] },
  { title: 'گزارش‌گیری و تحلیل', icon: FiBarChart2, slugs: ['financial-reports', 'payables-balances', 'receivables-balances', 'budgets'] },
  { title: 'پروژه‌ها', icon: FiLayers, slugs: ['projects', 'project-tasks', 'project-expenses'] },
  { title: 'تنظیمات سیستمی', icon: FiSettings, slugs: ['settings'], items: [
    { slug: 'settings', section: 'general', label: 'عمومی', icon: 'FiSettings', permission: 'settings.general.read' },
    { slug: 'settings', section: 'tax', label: 'مالیاتی', icon: 'FiDollarSign', permission: 'settings.tax.read' },
    { slug: 'settings', section: 'finance', label: 'مالی', icon: 'FiCreditCard', permission: 'settings.finance.read' },
    { slug: 'settings', section: 'inventory', label: 'انبار', icon: 'FiArchive', permission: 'settings.inventory.read' },
    { slug: 'settings', section: 'access', label: 'امنیت و دسترسی', icon: 'FiShield', permission: 'settings.security.read' },
    { slug: 'settings', section: 'print', label: 'چاپ و قالب اسناد', icon: 'FiPrinter', permission: 'settings.general.read' },
  ] },
  { title: 'مدیریت کاربران و دسترسی‌ها', icon: FiShield, slugs: ['users', 'roles', 'permissions'] },
]
const findResource = (slug) => slug === 'settings' ? { slug: 'settings', label: 'تنظیمات', icon: 'FiSettings', permission: ['settings.general.read', 'settings.tax.read', 'settings.finance.read'] } : resources.find((item) => item.slug === slug)
const groupItems = (group) => (group.items || group.slugs.map((slug) => slug ? findResource(slug) : ({ slug: '', label: 'داشبورد', icon: 'FiGrid' })).filter(Boolean)).map((item) => group.labels?.[item.slug] ? { ...item, label: group.labels[item.slug] } : item)

export default function AppLayout({ theme, toggleTheme }) {
  const dispatch = useDispatch(), navigate = useNavigate(), location = useLocation()
  const user = useSelector((s) => s.session.user), queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false), [profileOpen, setProfileOpen] = useState(false), [openGroupIndex, setOpenGroupIndex] = useState(null), [commandOpen, setCommandOpen] = useState(false), [commandQuery, setCommandQuery] = useState(''), [followupOpen, setFollowupOpen] = useState(false), [helpOpen, setHelpOpen] = useState(false), [passwordDialogOpen, setPasswordDialogOpen] = useState(false), [passwordBusy, setPasswordBusy] = useState(false)
  const permissions = user?.permissions || []
  const isSuperAdmin = user?.rolename?.toLocaleLowerCase('fa') === 'مدیر سایت'
  const canSee = (item) => !item.permission || (Array.isArray(item.permission) ? item.permission.some(permission => permissions.includes(permission)) : permissions.includes(item.permission)) || user?.rolename?.toLowerCase() === 'مدیر سایت'
  const activeGroupIndex = groups.findIndex((group) => group.slugs.some((slug) => slug && location.pathname.startsWith(`/${slug}`)))

  useEffect(() => {
    setOpenGroupIndex(activeGroupIndex >= 0 ? activeGroupIndex : null)
  }, [activeGroupIndex])

  useEffect(() => {
    const onKeys = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); setCommandQuery('') }
      if (event.key === 'Escape') { setCommandOpen(false); setFollowupOpen(false); setHelpOpen(false) }
    }
    window.addEventListener('keydown', onKeys)
    return () => window.removeEventListener('keydown', onKeys)
  }, [])

  const commandItems = groups.flatMap((group) => groupItems(group).filter(canSee).map((item) => ({ ...item, group: group.title })))
  const commandResults = commandItems.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase('fa').includes(commandQuery.trim().toLocaleLowerCase('fa'))).slice(0, 12)
  const goTo = (item) => { navigate(typeof item === 'string' ? (item ? `/${item}` : '/') : item.to || (item.section ? `/settings?section=${item.section}` : `/${item.slug || ''}`)); setCommandOpen(false); setFollowupOpen(false); setMobileOpen(false) }

  useEffect(() => {
    const handleFormKeys = (event) => {
      const target = event.target
      const form = target instanceof HTMLElement ? target.closest('form') : null
      if (!form) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])')
        if (!submitButton?.disabled) form.requestSubmit()
        return
      }

      if (event.key !== 'Enter' || event.defaultPrevented || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
      if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
      if (target.tagName !== 'INPUT' || ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden'].includes(target.type)) return

      const fields = [...form.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, textarea, button[type="submit"], input[type="submit"]')]
        .filter((field) => !field.disabled && !field.readOnly && field.getClientRects().length > 0)
      const currentIndex = fields.indexOf(target)
      if (currentIndex < 0) return
      event.preventDefault()
      ;(fields[currentIndex + 1] || form.querySelector('button[type="submit"], input[type="submit"]'))?.focus()
    }

    document.addEventListener('keydown', handleFormKeys)
    return () => document.removeEventListener('keydown', handleFormKeys)
  }, [])

  const signOut = async () => { try { await api.post('/auth/logout') } catch (e) { if (e.response?.status !== 401) toast.error(getErrorMessage(e)) } finally { dispatch(clearSession()); queryClient.clear(); navigate('/login', { replace: true }) } }
  const submitPasswordChange = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword') || '')
    const newPassword = String(form.get('newPassword') || '')
    const confirmPassword = String(form.get('confirmPassword') || '')
    if (newPassword !== confirmPassword) { toast.error('تکرار رمز جدید با رمز واردشده یکسان نیست'); return }
    if (newPassword === currentPassword) { toast.error('رمز جدید باید با رمز فعلی متفاوت باشد'); return }
    setPasswordBusy(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      toast.success('رمز عبور تغییر کرد؛ برای امنیت دوباره وارد شوید')
      setPasswordDialogOpen(false)
      dispatch(clearSession()); queryClient.clear(); navigate('/login', { replace: true })
    } catch (error) { toast.error(getErrorMessage(error)) } finally { setPasswordBusy(false) }
  }
  const navContent = <><div className="sidebar-brand"><span className="brand-mark"><FiLayers/></span><span>راهکار <small>ERP SYSTEM</small></span><span className="brand-version">v1</span></div><nav className="side-nav">{groups.map((group, index) => {
    const items = groupItems(group).filter(canSee)
    if (!items.length) return null
    const GroupIcon = group.icon
    const isOpen = openGroupIndex === index
    if (index === 0) return <div className="nav-group" key={group.title}><span className="nav-group-title">{group.title}</span>{items.map((item) => { const Icon = iconMap[item.icon] || FiLayers; return <NavLink key={item.slug} to="/" end onClick={() => setMobileOpen(false)} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><Icon/><span>{item.label}</span></NavLink> })}</div>
    return <div className={`nav-group ${isOpen ? 'expanded' : ''}`} key={group.title}><button className="nav-group-heading" type="button" aria-expanded={isOpen} onClick={() => setOpenGroupIndex((current) => current === index ? null : index)}><GroupIcon className="nav-group-icon"/><span>{group.title}</span><FiChevronDown className="nav-group-toggle"/></button><div className={`nav-group-items ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen} inert={!isOpen}><div className="nav-group-items-inner">{items.map((item) => { const Icon = iconMap[item.icon] || FiLayers; const to = item.section ? `/settings?section=${item.section}` : `/${item.slug}`; const activeSection = new URLSearchParams(location.search).get('section') || 'general'; const active = item.section ? location.pathname === '/settings' && activeSection === item.section : location.pathname === to || location.pathname.startsWith(`${to}/`); return <NavLink key={item.section || item.slug} to={to} end onClick={() => setMobileOpen(false)} className={() => `nav-link ${active ? 'active' : ''}`}><Icon/><span>{item.label}</span></NavLink> })}</div></div></div>
  })}{isSuperAdmin && <NavLink to="/log-dashboard" onClick={() => setMobileOpen(false)} className={({isActive}) => `nav-link log-dashboard-nav-link ${isActive ? 'active' : ''}`}><FiActivity/><span>داشبورد لاگ‌ها</span></NavLink>}</nav></>
  return <div className="app-shell"><aside className="sidebar">{navContent}</aside>{mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)}/>}<aside className={`mobile-sidebar ${mobileOpen ? 'open' : ''}`}>{navContent}</aside><div className="app-main"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><FiMenu/></button><div className="breadcrumb"><span>راهکار</span><FiChevronLeft/><strong>پنل مدیریت</strong></div><div className="topbar-actions"><button className="global-search global-search-trigger" type="button" onClick={() => { setCommandOpen(true); setCommandQuery('') }}><FiSearch/><span>جستجو در سامانه...</span><kbd>Ctrl K</kbd></button><button className="icon-button theme-toggle" onClick={toggleTheme} title="تغییر تم">{theme === 'light' ? <FiMoon/> : <FiSun/>}</button><div className="followup-wrap"><button className="icon-button notification-button" title="مرکز پیگیری" aria-expanded={followupOpen} onClick={() => setFollowupOpen((value) => !value)}><FiBell/></button>{followupOpen && <div className="followup-popover"><strong>مرکز پیگیری</strong><p>دسترسی سریع به کارهای روزمره</p>{[['cash-vouchers','دریافت و پرداخت'],['payables','پرداختنی‌ها'],['sales-invoices','فاکتورهای فروش'],['purchase-invoices','فاکتورهای خرید'],['leaves','درخواست‌های مرخصی'],['support-tickets','تیکت‌های پشتیبانی']].filter(([slug]) => commandItems.some((item) => item.slug === slug)).map(([slug,label]) => <button key={slug} type="button" onClick={() => goTo(slug)}><FiArrowUpLeft/>{label}<FiChevronLeft/></button>)}</div>}</div><div className="topbar-separator"/><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)}><span className="user-avatar">{user?.username?.slice(0,1) || 'ک'}</span><span><strong>{user?.username || 'کاربر'}</strong><small>{user?.rolename || 'مدیر سیستم'}</small></span><FiChevronDown/></button>{profileOpen && <div className="profile-menu"><button onClick={() => { setProfileOpen(false); setPasswordDialogOpen(true) }}><FiLock/> تغییر رمز عبور</button><button onClick={signOut}><FiLogOut/> خروج از حساب</button></div>}</div></div></header><main className="page-content"><Outlet/></main><nav className="mobile-tabbar"><NavLink to="/" end><FiGrid/><span>خانه</span></NavLink><NavLink to="/products"><FiPackage/><span>کالاها</span></NavLink><NavLink to="/sales-invoices"><FiShoppingBag/><span>بازرگانی</span></NavLink><NavLink to="/inventory"><FiArchive/><span>انبار</span></NavLink><button onClick={() => setMobileOpen(true)}><FiMenu/><span>بیشتر</span></button></nav></div>{commandOpen && <div className="command-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCommandOpen(false)}><section className="command-dialog" role="dialog" aria-modal="true" aria-label="جستجو در سامانه"><label className="command-input"><FiSearch/><input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="نام صفحه یا بخش موردنظر را بنویسید…"/><kbd>ESC</kbd></label><div className="command-results">{commandResults.map((item) => { const Icon = iconMap[item.icon] || FiLayers; return <button key={item.section || item.slug || 'home'} type="button" onClick={() => goTo(item)}><span><Icon/><b>{item.label}</b></span><small>{item.group}</small><FiChevronLeft/></button> })}{!commandResults.length && <p>صفحه‌ای با این عبارت پیدا نشد.</p>}</div><footer><span>برای جست‌وجو از <kbd>Ctrl K</kbd> استفاده کنید</span><button type="button" onClick={() => setCommandOpen(false)}><FiX/> بستن</button></footer></section></div>}{helpOpen && <div className="command-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setHelpOpen(false)}><section className="help-dialog" role="dialog" aria-modal="true" aria-label="راهنمای سامانه"><div className="help-dialog-head"><span><FiHelpCircle/></span><div><h2>راهنمای سامانه</h2><p>میانبرهای کاربردی و دسترسی به بخش‌ها</p></div><button className="icon-button" type="button" onClick={() => setHelpOpen(false)} aria-label="بستن"><FiX/></button></div><div className="help-shortcut"><span>جست‌وجوی صفحه‌ها</span><kbd>Ctrl K</kbd></div><div className="help-shortcut"><span>رفتن به بخش موردنظر</span><small>نام صفحه را جست‌وجو و انتخاب کنید</small></div><div className="help-links">{commandItems.slice(0,8).map((item) => <button key={item.section || item.slug || 'home'} type="button" onClick={() => { setHelpOpen(false); goTo(item) }}>{item.label}<FiChevronLeft/></button>)}</div></section></div>}{passwordDialogOpen && <div className="command-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPasswordDialogOpen(false)}><section className="help-dialog password-dialog" role="dialog" aria-modal="true" aria-labelledby="change-password-title"><div className="help-dialog-head"><span><FiLock/></span><div><h2 id="change-password-title">تغییر رمز عبور</h2><p>برای امنیت، پس از ثبت دوباره وارد سامانه می‌شوید.</p></div><button className="icon-button" type="button" onClick={() => setPasswordDialogOpen(false)} aria-label="بستن"><FiX/></button></div><form className="password-change-form" onSubmit={submitPasswordChange}><label>رمز عبور فعلی<input type="password" name="currentPassword" autoComplete="current-password" minLength="5" maxLength="72" required/></label><label>رمز عبور جدید<input type="password" name="newPassword" autoComplete="new-password" minLength="5" maxLength="72" required/><small>حداقل ۵ نویسه</small></label><label>تکرار رمز عبور جدید<input type="password" name="confirmPassword" autoComplete="new-password" minLength="5" maxLength="72" required/></label><footer><button className="btn btn-secondary" type="button" onClick={() => setPasswordDialogOpen(false)}>انصراف</button><button className="btn btn-primary" disabled={passwordBusy}>{passwordBusy ? <span className="spinner"/> : <><FiLock/> تغییر رمز</>}</button></footer></form></section></div>}</div>
}
