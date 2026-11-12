import { useState } from 'react'
import datePickerModule from 'react-multi-date-picker'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'

const DatePicker = datePickerModule.default

const isoDate = (date) => {
  if (!date) return ''
  const value = date.toDate()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export default function JalaliDateInput({ value, defaultValue = '', onChange, className = 'form-control', name, required, monthOnly = false, jalaliMonthKey = false, ...props }) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selectedValue = value === undefined ? internalValue : value
  const nativeDate = selectedValue
    ? jalaliMonthKey
      ? new DateObject({ date: `${String(selectedValue).slice(0, 7).replace('-', '/')}/01`, calendar: persian, locale: persian_fa })
      : new Date(`${String(selectedValue).slice(0, monthOnly ? 7 : 10)}${monthOnly ? '-25' : ''}T12:00:00`)
    : null
  const pickerValue = nativeDate instanceof Date
    ? (Number.isNaN(nativeDate.getTime()) ? '' : nativeDate)
    : (nativeDate || '')
  const handleChange = (date) => {
    let next = date ? isoDate(date) : ''
    let periodStartDate
    if (date && monthOnly) {
      if (jalaliMonthKey) {
        next = `${date.year}-${String(date.month.number).padStart(2, '0')}`
        periodStartDate = isoDate(new DateObject(date).set({ day: 1 }))
      } else {
        const midpoint = date.toDate()
        midpoint.setDate(midpoint.getDate() + (15 - date.day))
        next = `${midpoint.getFullYear()}-${String(midpoint.getMonth() + 1).padStart(2, '0')}`
      }
    }
    if (value === undefined) setInternalValue(next)
    onChange?.(next, periodStartDate)
  }
  return <>{name && <input type="hidden" name={name} value={selectedValue || ''} readOnly/>}<DatePicker value={pickerValue} onChange={handleChange} calendar={persian} locale={persian_fa} digits={['0','1','2','3','4','5','6','7','8','9']} format={monthOnly ? 'YYYY/MM' : 'YYYY/MM/DD'} calendarPosition="bottom-right" inputClass={className} placeholder={monthOnly ? '1405/08' : '1405/08/10'} required={required} onlyMonthPicker={monthOnly} {...props} /></>
}
