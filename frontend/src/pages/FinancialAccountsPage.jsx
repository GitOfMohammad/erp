import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FiAlertCircle, FiCheck, FiChevronDown, FiFileText, FiFolder, FiLayers, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import { fetchAllPages } from '../utils/fetchAllPages'
import DataExportActions from '../components/DataExportActions'

const fa = value => new Intl.NumberFormat('fa-IR').format(Number(value || 0))

function buildTree(accounts) {
  const nodes = new Map(accounts.map(account => [String(account.id), { ...account, children: [] }]))
  const roots = []
  for (const node of nodes.values()) {
    const parent = node.parent_id && nodes.get(String(node.parent_id))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const order = (items) => items.sort((a, b) => String(a.code).localeCompare(String(b.code), 'en', { numeric: true })).forEach(item => order(item.children))
  order(roots)
  return roots
}

function TreeAccount({ account, depth, collapsed, toggle, forceOpen = false, canManage, onAccountContext, editor, setEditor, onSaveEdit, saving }) {
  const hasChildren = account.children.length > 0
  const isOpen = forceOpen || !collapsed.has(String(account.id))
  const isEditing = editor?.accountId === account.id
  return <>
    <div className={`financial-tree-row depth-${Math.min(depth, 3)} ${hasChildren ? 'has-children' : 'leaf'} ${Number(account.is_group_root) === 1 ? 'financial-tree-root' : ''}`} style={{ '--tree-depth': depth }} onContextMenu={event => { if (canManage) { event.preventDefault(); onAccountContext(event, account) } }}>
      <div className="financial-tree-label">
        {hasChildren ? <button className="financial-tree-toggle" type="button" onClick={() => toggle(account.id)} aria-label={isOpen ? 'بستن زیرحساب‌ها' : 'نمایش زیرحساب‌ها'}><FiChevronDown className={isOpen ? 'is-open' : ''} /></button> : <span className="financial-tree-toggle-placeholder" />}
        {hasChildren ? <FiFolder className="financial-tree-icon folder" /> : <FiFileText className="financial-tree-icon" />}
        <span className="financial-tree-name">{isEditing ? <><input autoFocus value={editor.name} onChange={event => setEditor({ ...editor, name: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') onSaveEdit(account); if (event.key === 'Escape') setEditor(null) }} aria-label="نام حساب" /><button className="financial-tree-inline-action save" type="button" onClick={() => onSaveEdit(account)} disabled={saving || !editor.name.trim()} aria-label="ثبت تغییر"><FiCheck /></button><button className="financial-tree-inline-action cancel" type="button" onClick={() => setEditor(null)} disabled={saving} aria-label="لغو ویرایش"><FiX /></button></> : <><b>{account.name}</b><small>{Number(account.is_group_root) === 1 ? 'گروه اصلی · سیستمی' : depth === 1 ? 'حساب کل' : depth === 2 ? 'حساب معین' : 'حساب تفصیلی'}</small></>}</span>
        {hasChildren && <span className="financial-tree-count">{fa(account.children.length)} زیرحساب</span>}
      </div>
      <span className="financial-tree-code">{account.code}</span>
      <span className={`financial-tree-status ${Number(account.is_active) === 1 ? 'active' : ''}`}>{Number(account.is_active) === 1 ? 'فعال' : 'غیرفعال'}</span>
    </div>
    {hasChildren && <div className={`financial-tree-children-wrap ${isOpen ? 'open' : 'closed'}`} aria-hidden={!isOpen}><div className="financial-tree-children">{account.children.map(child => <TreeAccount key={child.id} account={child} depth={depth + 1} collapsed={collapsed} toggle={toggle} forceOpen={forceOpen} canManage={canManage} onAccountContext={onAccountContext} editor={editor} setEditor={setEditor} onSaveEdit={onSaveEdit} saving={saving} />)}</div></div>}
  </>
}

function filterTree(accounts, query) {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return accounts
  return accounts.map(account => {
    const children = filterTree(account.children, query)
    const matches = `${account.name} ${account.code}`.toLocaleLowerCase().includes(needle)
    return matches || children.length ? { ...account, children: matches ? account.children : children, _match: matches } : null
  }).filter(Boolean)
}

export default function FinancialAccountsPage() {
  const user = useSelector(state => state.session.user)
  const canRead = user?.rolename?.toLowerCase() === 'مدیر سایت' || user?.permissions?.includes('financial.gl.read')
  const canManage = user?.rolename?.toLowerCase() === 'مدیر سایت' || user?.permissions?.includes('financial.gl.accounts.manage')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)
  const [editor, setEditor] = useState(null)
  const [adding, setAdding] = useState(null)
  const [newAccountName, setNewAccountName] = useState('')
  const query = useQuery({ queryKey: ['resource', '/financial/gl/accounts/tree'], queryFn: async () => ({ items: await fetchAllPages('/financial/gl/accounts') }), enabled: canRead })
  const refreshAccounts = () => queryClient.invalidateQueries({ queryKey: ['resource', '/financial/gl/accounts/tree'] })
  const updateAccount = useMutation({ mutationFn: async ({ id, name }) => unwrap(await api.patch(`/financial/gl/accounts/${id}`, { name })), onSuccess: () => { toast.success('نام حساب ویرایش شد'); setEditor(null); refreshAccounts() }, onError: error => toast.error(getErrorMessage(error)) })
  const deleteAccount = useMutation({ mutationFn: async id => unwrap(await api.delete(`/financial/gl/accounts/${id}`)), onSuccess: () => { toast.success('حساب حذف شد'); refreshAccounts() }, onError: error => toast.error(getErrorMessage(error)) })
  const createAccount = useMutation({ mutationFn: async ({ name, accountType, parentId }) => unwrap(await api.post('/financial/gl/accounts', { name, accountType, parentId })), onSuccess: (result, variables) => { if (variables.parentId) setCollapsed(current => { const next = new Set(current); next.delete(String(variables.parentId)); return next }); toast.success(`حساب «${result?.name || newAccountName.trim()}» ثبت شد`); setAdding(null); setNewAccountName(''); refreshAccounts() }, onError: error => toast.error(getErrorMessage(error)) })
  const allAccounts = query.data?.items || []
  const accountTree = useMemo(() => buildTree(allAccounts), [allAccounts])
  const visibleTree = useMemo(() => filterTree(accountTree, search), [accountTree, search])
  const toggle = id => setCollapsed(current => { const next = new Set(current); const key = String(id); next.has(key) ? next.delete(key) : next.add(key); return next })
  const accountCount = allAccounts.length
  const countNodes = nodes => nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0)
  const visibleCount = countNodes(visibleTree)
  const startEdit = account => { setContextMenu(null); if (Number(account.is_group_root) !== 1) setEditor({ accountId: account.id, name: account.name }) }
  const saveEdit = account => { const name = editor?.name?.trim(); if (!name || name === account.name) { setEditor(null); return } updateAccount.mutate({ id: account.id, name }) }
  const startAdd = mode => { const account = contextMenu?.account; if (!account) return; setContextMenu(null); setEditor(null); setAdding({ mode, account }); setNewAccountName('') }
  const removeAccount = account => { setContextMenu(null); if (window.confirm(`حساب «${account.name}» حذف شود؟ فقط حساب‌های بدون گردش و بدون زیرحساب قابل حذف هستند.`)) deleteAccount.mutate(account.id) }
  const submitAdd = event => { event.preventDefault(); if (!adding || newAccountName.trim().length < 2) return; createAccount.mutate({ name: newAccountName.trim(), parentId: adding.mode === 'child' ? adding.account.id : adding.account.parent_id }) }
  const openContextMenu = (event, account) => { setEditor(null); setContextMenu({ x: Math.min(event.clientX, window.innerWidth - 230), y: Math.min(event.clientY, window.innerHeight - 155), account }) }

  return <section className="resource-page financial-accounts-page">
    <header className="financial-tree-heading"><div><span className="eyebrow">مدیریت مالی</span><h1>سرفصل‌های حسابداری</h1><p>گروه‌های اصلی و ماهیت حساب‌ها ثابت‌اند؛ برای ویرایش نام، افزودن هم‌سطح یا زیرحساب و حذف حساب بدون گردش، روی آن راست‌کلیک کنید.</p></div><div className="resource-header-actions"><DataExportActions title="سرفصل‌های حسابداری" headers={['کد حساب','نام حساب','نوع حساب','حساب بالادست','وضعیت']} rows={allAccounts.map(account => [account.code, account.name, account.account_type, allAccounts.find(parent => String(parent.id) === String(account.parent_id))?.name || '—', Number(account.is_active) === 1 ? 'فعال' : 'غیرفعال'])} subtitle="فهرست کامل سرفصل‌های حسابداری"/><button className="btn btn-secondary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}><FiRefreshCw /> به‌روزرسانی</button></div></header>
    {!canRead ? <div className="error-state"><FiAlertCircle /><strong>دسترسی به این بخش ندارید</strong></div> : <>
      <div className="financial-tree-summary"><div className="financial-tree-summary-icon"><FiLayers /></div><div><b>{fa(accountCount)}</b><span>حساب ثبت‌شده</span></div><span className="financial-tree-sync"><i /> همگام با سامانه</span></div>
      <section className="financial-tree-card"><div className="financial-tree-toolbar"><div className="financial-tree-title"><h2>جدول حساب‌ها</h2><span>{fa(visibleCount)} مورد</span></div><label className="financial-tree-search"><FiSearch /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="جستجو در کد یا عنوان حساب..." /></label></div>
        <div className="financial-tree-columns"><span>عنوان حساب / نوع</span><span>کد</span><span>وضعیت</span></div>
        {query.isLoading ? <div className="loading-line" /> : query.isError ? <div className="error-state"><FiAlertCircle />{getErrorMessage(query.error)}</div> : !visibleTree.length ? <div className="empty-state">{search ? 'حسابی با این جستجو پیدا نشد.' : 'حسابی برای نمایش ثبت نشده است.'}</div> : <section className="financial-tree-group">{visibleTree.map(account => <TreeAccount key={account.id} account={account} depth={0} collapsed={collapsed} toggle={toggle} forceOpen={Boolean(search)} canManage={canManage} onAccountContext={openContextMenu} editor={editor} setEditor={setEditor} onSaveEdit={saveEdit} saving={updateAccount.isPending} />)}</section>}
      </section>
    </>}
    {contextMenu && <div className="financial-tree-menu-backdrop" onClick={() => setContextMenu(null)} onContextMenu={event => { event.preventDefault(); setContextMenu(null) }}><div className="financial-tree-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={event => event.stopPropagation()}>{Number(contextMenu.account.is_group_root) !== 1 && <><button type="button" onClick={() => startEdit(contextMenu.account)}><FiFileText /> ویرایش نام</button><button type="button" onClick={() => startAdd('sibling')}><FiLayers /> افزودن هم‌سطح</button><button className="financial-tree-delete-action" type="button" onClick={() => removeAccount(contextMenu.account)} disabled={deleteAccount.isPending}><FiTrash2 /> حذف حساب</button></>}<button type="button" onClick={() => startAdd('child')}><FiPlus /> افزودن زیرحساب</button></div></div>}
    {adding && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setAdding(null)}><section className="modal-card financial-account-add-modal"><div className="modal-heading"><div><span className="eyebrow">{adding.mode === 'sibling' ? 'افزودن هم‌سطح' : 'افزودن زیرحساب'}</span><h2>حساب جدید</h2></div><button className="icon-button" type="button" onClick={() => setAdding(null)} aria-label="بستن"><FiX /></button></div><p>{adding.mode === 'sibling' ? `این حساب در همان سطح «${adding.account.name}» قرار می‌گیرد.` : `این حساب زیرمجموعهٔ «${adding.account.name}» خواهد بود.`} کد حساب به‌صورت خودکار ساخته می‌شود.</p><form className="modal-form" onSubmit={submitAdd}><label className="form-field"><span>عنوان حساب *</span><input autoFocus required minLength="2" maxLength="150" value={newAccountName} onChange={event => setNewAccountName(event.target.value)} placeholder="عنوان حساب را وارد کنید" /></label><div className="modal-actions"><button className="btn btn-secondary" type="button" onClick={() => setAdding(null)}>انصراف</button><button className="btn btn-primary" type="submit" disabled={createAccount.isPending || newAccountName.trim().length < 2}>{createAccount.isPending ? 'در حال ثبت…' : 'ثبت حساب'}</button></div></form></section></div>}
  </section>
}
