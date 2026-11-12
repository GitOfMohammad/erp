import { useQuery } from '@tanstack/react-query'
import SearchableSelect from './SearchableSelect'
import FormattedNumberInput from './FormattedNumberInput'
import JalaliDateInput from './JalaliDateInput'
import { api, unwrap } from '../services/api'

const currencyOptions = [
  { id: 'IRR', label: 'ریال (IRR)' },
  { id: 'USD', label: 'دلار آمریکا (USD)' },
  { id: 'EUR', label: 'یورو (EUR)' },
  { id: 'AED', label: 'درهم امارات (AED)' },
]

export default function CommercialCurrencyFields({ currency, setCurrency, exchangeRate, setExchangeRate, dueDate, setDueDate, lockCurrency = false }) {
  const currenciesQuery = useQuery({ queryKey: ['settings', 'finance', 'currencies'], queryFn: async () => unwrap(await api.get('/settings/finance/currencies')), staleTime: 60_000 })
  const enabled = currenciesQuery.data?.currencies || ['IRR']
  const options = currencyOptions.filter(option => enabled.includes(option.id) || option.id === currency)
  const unit = currency === 'IRR' ? 'ریال' : currency
  return <>
    <label className="form-field"><span>ارز سند *</span><SearchableSelect disabled={lockCurrency || currenciesQuery.isLoading} options={options} value={currency} onChange={(value) => { setCurrency(value); if (value === 'IRR') setExchangeRate('1') }} placeholder="جست‌وجوی ارز"/>{currenciesQuery.isError && <small>فهرست ارزهای مجاز دریافت نشد؛ دوباره صفحه را بارگذاری کنید.</small>}</label>
    <label className="form-field"><span>{currency === 'IRR' ? 'نرخ تبدیل' : `نرخ هر واحد ${currency} به ریال *`}</span><FormattedNumberInput className="form-control" decimalScale={0} value={currency === 'IRR' ? '1' : exchangeRate} disabled={currency === 'IRR'} onValueChange={setExchangeRate}/><small>نرخ این سند ثابت می‌ماند. مبلغ‌های ارزی به واحد کامل وارد می‌شوند.</small></label>
    <label className="form-field"><span>تاریخ سررسید (اختیاری)</span><JalaliDateInput className="form-control" value={dueDate} onChange={setDueDate}/></label>
    <div className="form-field"><span>واحد مبلغ سند</span><div className="commercial-currency-hint">{unit} · معادل ریالی براساس نرخ همین سند برای دفتر مالی ذخیره می‌شود.</div></div>
  </>
}
