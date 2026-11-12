export function formatPersianDate(value, withTime = false) {
  if (!value) return '—'
  const raw = String(value)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function formatPersianMonth(value) {
  if (!value) return '—'
  const raw = String(value)
  const date = new Date(/^\d{4}-\d{2}$/.test(raw) ? `${raw}-25T12:00:00` : raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: 'long' }).format(date)
}

export function formatJalaliMonthKey(value) {
  const match = String(value || '').match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!match) return value || '—'
  const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
  return `${monthNames[Number(match[2]) - 1]} ${new Intl.NumberFormat('fa-IR').format(Number(match[1]))}`
}
