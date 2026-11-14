import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from './services/api'
import { setUser } from './store/store'
import { useTheme } from './utils/useTheme'
import AppLayout from './layout/AppLayout'
import { resources } from './utils/resources'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ResourcePage = lazy(() => import('./pages/ResourcePage'))
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'))
const PurchaseInvoicesPage = lazy(() => import('./pages/PurchaseInvoicesPage'))
const PurchaseReturnsPage = lazy(() => import('./pages/PurchaseReturnsPage'))
const SalesOrdersPage = lazy(() => import('./pages/SalesOrdersPage'))
const SalesInvoicesPage = lazy(() => import('./pages/SalesInvoicesPage'))
const SalesReturnsPage = lazy(() => import('./pages/SalesReturnsPage'))
const FinancialReportsPage = lazy(() => import('./pages/FinancialReportsPage'))
const BankReconciliationPage = lazy(() => import('./pages/BankReconciliationPage'))
const CashVouchersPage = lazy(() => import('./pages/CashVouchersPage'))
const CompanyCheckbooksPage = lazy(() => import('./pages/CompanyCheckbooksPage'))
const FinancialAccountsPage = lazy(() => import('./pages/FinancialAccountsPage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ProductionPage = lazy(() => import('./pages/ProductionPage'))
const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const CrmPages = lazy(() => import('./pages/CrmPages'))
const HrPage = lazy(() => import('./pages/HrPage'))
const HrDashboardPage = lazy(() => import('./pages/HrDashboardPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const VendorUpdatesPage = lazy(() => import('./pages/VendorUpdatesPage'))
const ShipmentsPage = lazy(() => import('./pages/ShipmentsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LogDashboardPage = lazy(() => import('./pages/LogDashboardPage'))
function Guard({ children }) {
  const session = useSelector((s) => s.session)
  const location = useLocation()
  return session.accessToken ? children : <Navigate to="/login" replace state={{ from: location }} />
}
function Loading() { return <div className="route-loading min-h-screen"><span className="spinner dark-spinner" /><span>در حال آماده‌سازی صفحه…</span></div> }

export default function App() {
  const dispatch = useDispatch()
  const token = useSelector((s) => s.session.accessToken)
  const [theme, toggleTheme] = useTheme()
  useEffect(() => {
    if (!token) return
    api.get('/auth/me').then((r) => dispatch(setUser(unwrap(r)))).catch((e) => { if (e.response?.status !== 401) toast.error(getErrorMessage(e)) })
  }, [token, dispatch])
  return <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Guard><AppLayout theme={theme} toggleTheme={toggleTheme} /></Guard>}>
        <Route index element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="log-dashboard" element={<LogDashboardPage />} />
        <Route path="hr-dashboard" element={<HrDashboardPage />} />
        {resources.map((resource) => <Route key={resource.slug} path={resource.slug} element={resource.slug === 'vendor-updates' ? <VendorUpdatesPage /> : resource.slug === 'shipments' ? <ShipmentsPage /> : resource.group === 'hr' ? <HrPage resource={resource} /> : resource.group === 'projects' ? <ProjectsPage resource={resource} /> : resource.group === 'production' ? <ProductionPage resource={resource} /> : resource.slug === 'purchase-orders' ? <PurchaseOrdersPage resource={resource} /> : resource.slug === 'purchase-invoices' ? <PurchaseInvoicesPage resource={resource} /> : resource.slug === 'purchase-returns' ? <PurchaseReturnsPage resource={resource} /> : resource.slug === 'sales-orders' ? <SalesOrdersPage resource={resource} /> : resource.slug === 'sales-invoices' ? <SalesInvoicesPage resource={resource} /> : resource.slug === 'sales-returns' ? <SalesReturnsPage resource={resource} /> : resource.slug === 'cash-vouchers' ? <CashVouchersPage /> : resource.slug === 'company-checkbooks' ? <CompanyCheckbooksPage /> : resource.slug === 'journal-accounts' ? <FinancialAccountsPage /> : resource.slug === 'budgets' ? <BudgetsPage /> : resource.slug === 'leads' ? <LeadsPage /> : ['interactions', 'support-tickets', 'contracts'].includes(resource.slug) ? <CrmPages resource={resource} /> : resource.slug === 'financial-reports' ? <FinancialReportsPage /> : resource.slug === 'bank-reconciliation' ? <BankReconciliationPage /> : <ResourcePage resource={resource} />} />)}
        <Route path="receipts" element={<Navigate to="/cash-vouchers?tab=receipt" replace />} />
        <Route path="payments" element={<Navigate to="/cash-vouchers?tab=payment" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </Suspense>
}

