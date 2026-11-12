import SearchableSelect from '../components/SearchableSelect'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FiAlertCircle, FiCreditCard, FiPlus } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import DataExportActions from '../components/DataExportActions'
import { fetchAllPages } from '../utils/fetchAllPages'

const emptyDraft = { name: '', treasuryAccountId: '', numberPrefix: '', numberStart: '', numberEnd: '' }
const asciiDigits = value => String(value || '').replace(/[۰-۹٠-٩]/g, digit => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(digit) % 10))
const faNumber = value => new Intl.NumberFormat('fa-IR').format(Number(value || 0))

export default function CompanyCheckbooksPage() {
  const user = useSelector(state => state.session.user)
  const isAdmin = user?.rolename?.toLowerCase() === 'مدیر سایت'
  const canRead = isAdmin || user?.permissions?.includes('financial.cash-vouchers.read')
  const canCreate = isAdmin || user?.permissions?.includes('financial.cash-vouchers.create')
  const [draft, setDraft] = useState(emptyDraft)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const booksQuery = useQuery({ queryKey: ['company-checkbooks', page], queryFn: async () => unwrap(await api.get(`/financial/company-checkbooks?page=${page}&limit=20`)), enabled: canRead })
  const accountsQuery = useQuery({ queryKey: ['active-treasury-accounts'], queryFn: async () => ({ items: await fetchAllPages('/financial/treasury/accounts?is_active=1') }), enabled: canRead && canCreate })
  const books = booksQuery.data?.items || []
  const pagination = booksQuery.data?.pagination
  const accounts = accountsQuery.data?.items || accountsQuery.data?.rows || accountsQuery.data || []
  const loadBooksExportRows = async () => (await fetchAllPages('/financial/company-checkbooks')).map(book => [book.name, book.treasuryAccount?.bank_name || book.treasuryAccount?.name || '—', `${book.number_prefix || ''}${String(book.number_start).padStart(book.number_width, '0')}`, `${book.number_prefix || ''}${String(book.number_end).padStart(book.number_width, '0')}`, faNumber(book.issued_count), faNumber(book.number_count)])
  const create = useMutation({
    mutationFn: async payload => unwrap(await api.post('/financial/company-checkbooks', payload)),
    onSuccess: () => { toast.success('دسته‌چک ثبت شد'); setPage(1); queryClient.invalidateQueries({ queryKey: ['company-checkbooks'] }); setDraft(emptyDraft) },
    onError: error => toast.error(getErrorMessage(error))
  })
  const submit = event => {
    event.preventDefault()
    if (draft.numberStart.length !== draft.numberEnd.length || BigInt(draft.numberEnd || 0) < BigInt(draft.numberStart || 0)) {
      toast.error('شمارهٔ شروع و پایان باید هم‌طول و بازه معتبر باشد')
      return
    }
    create.mutate(draft)
  }
  return <section className="resource-page cash-voucher-page company-checkbooks-page">
    <header className="cash-voucher-heading"><div className="cash-voucher-brand"><div className="cash-voucher-logo"><FiCreditCard /></div><div><h1>مدیریت دسته‌چک‌ها</h1><p>تعریف دسته‌چک‌های شرکت و پیگیری شماره‌های صادرشده</p></div></div></header>
    {!canRead ? <div className="error-state"><FiAlertCircle /><strong>دسترسی به این بخش ندارید</strong></div> : <>
      {canCreate && <section className="cash-card company-checkbook-form"><div className="cash-list-heading"><h2>افزودن دسته‌چک</h2></div><form className="modal-form" onSubmit={submit}>
        <label className="form-field"><span>نام دسته‌چک *</span><input required minLength="2" maxLength="120" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="مثلاً دسته‌چک جاری بانک ملت" /></label>
        <label className="form-field"><span>حساب بانکی شرکت *</span><SearchableSelect required value={draft.treasuryAccountId} onChange={event => setDraft({ ...draft, treasuryAccountId: event.target.value })}><option value="">انتخاب بانک شرکت</option>{accounts.filter(account => account.account_type === 'BANK').map(account => <option key={account.id} value={account.id}>{account.bank_name || account.name} · {account.code}</option>)}</SearchableSelect></label>
        <div className="form-grid"><label className="form-field"><span>پیشوند شماره (اختیاری)</span><input maxLength="20" value={draft.numberPrefix} onChange={event => setDraft({ ...draft, numberPrefix: event.target.value })} placeholder="مثلاً ۷۲" /></label><label className="form-field"><span>شمارهٔ شروع *</span><input required inputMode="numeric" pattern="[0-9]+" value={draft.numberStart} onChange={event => setDraft({ ...draft, numberStart: asciiDigits(event.target.value).replace(/[^0-9]/g, '') })} /></label><label className="form-field"><span>شمارهٔ پایان *</span><input required inputMode="numeric" pattern="[0-9]+" value={draft.numberEnd} onChange={event => setDraft({ ...draft, numberEnd: asciiDigits(event.target.value).replace(/[^0-9]/g, '') })} /></label></div>
        <p className="cash-summary-note">حداکثر ۵۰۰۰ شماره برای هر دسته‌چک ثبت می‌شود. هر شماره پس از صدور دوباره قابل استفاده نیست.</p><div className="modal-actions"><button type="submit" className="btn btn-primary" disabled={create.isPending || accountsQuery.isLoading}>{create.isPending ? 'در حال ثبت…' : <><FiPlus /> ثبت دسته‌چک</>}</button></div>
      </form></section>}
      <section className="cash-card cash-checkbook-list"><div className="cash-list-heading"><div><h2>دسته‌چک‌های ثبت‌شده</h2><span>{faNumber(pagination?.totalItems || 0)} مورد</span></div><DataExportActions title="دسته‌چک‌های شرکت" headers={['نام دسته‌چک','حساب بانکی','شماره شروع','شماره پایان','صادرشده','تعداد برگه']} loadRows={loadBooksExportRows} subtitle="فهرست کامل دسته‌چک‌های ثبت‌شده"/></div>{booksQuery.isLoading ? <div className="loading-line" /> : booksQuery.isError ? <div className="error-state"><FiAlertCircle />{getErrorMessage(booksQuery.error)}</div> : !books.length ? <div className="empty-state">هنوز دسته‌چکی تعریف نشده است.</div> : books.map(book => <div key={book.id} className="cash-checkbook-row"><b>{book.name}</b><span>{book.treasuryAccount?.bank_name || book.treasuryAccount?.name}</span><span>{book.number_prefix}{String(book.number_start).padStart(book.number_width, '0')} تا {book.number_prefix}{String(book.number_end).padStart(book.number_width, '0')}</span><small>{faNumber(book.issued_count)} صادرشده از {faNumber(book.number_count)}</small></div>)}{(pagination?.totalPages || 0) > 1 && <div className="table-footer"><span>صفحهٔ {faNumber(page)} از {faNumber(pagination.totalPages)}</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>صفحهٔ قبل</button><button disabled={page >= pagination.totalPages} onClick={() => setPage(value => value + 1)}>صفحهٔ بعد</button></div></div>}</section>
    </>}
  </section>
}
