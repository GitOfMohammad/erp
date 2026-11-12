export const toMilli = (value) => {
  if (!/^\d+(\.\d{1,3})?$/.test(String(value ?? ''))) return null
  const [whole, fraction = ''] = String(value).split('.')
  return BigInt(whole || 0) * 1000n + BigInt((fraction + '000').slice(0, 3))
}

export const parsePercent = (value) => {
  if (!/^\d{1,3}(\.\d{1,4})?$/.test(String(value ?? ''))) return null
  const [whole, fraction = ''] = String(value).split('.')
  const basis = BigInt(whole) * 10000n + BigInt((fraction + '0000').slice(0, 4))
  return basis <= 1000000n ? basis : null
}

export const percentOf = (amount, basis) => (amount * basis + 500000n) / 1000000n
export const rial = (value) => /^\d+$/.test(String(value ?? '')) ? BigInt(value) : 0n
export const quantityPrice = (quantity, price) => {
  const milli = toMilli(quantity)
  if (milli === null || !/^\d+$/.test(String(price ?? ''))) return 0n
  return (milli * BigInt(price) + 500n) / 1000n
}
export const formatRial = (value) => `${new Intl.NumberFormat('fa-IR').format(value)} ریال`
export const formatCurrency = (value, currency = 'IRR') => `${new Intl.NumberFormat('fa-IR').format(value)} ${currency === 'IRR' ? 'ریال' : currency}`

export function allocateRial(total, weights) {
  if (total === 0n) return weights.map(() => 0n)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0n)
  if (weightTotal === 0n) return weights.map(() => 0n)
  const allocated = weights.map((weight) => total * weight / weightTotal)
  const remainders = weights.map((weight, index) => ({ index, value: total * weight % weightTotal }))
  remainders.sort((a, b) => a.value === b.value ? a.index - b.index : a.value > b.value ? -1 : 1)
  let remaining = total - allocated.reduce((sum, value) => sum + value, 0n)
  for (let index = 0; remaining > 0n; index += 1, remaining -= 1n) allocated[remainders[index].index] += 1n
  return allocated
}

export function calculatePurchaseInvoice(lines, options = {}) {
  const entries = lines.map((line) => {
    const gross = quantityPrice(line.quantity, line.unitPrice)
    const discountPercentBasis = parsePercent(line.discountPercent || '0') ?? 0n
    const percentDiscount = percentOf(gross, discountPercentBasis)
    const fixedDiscount = rial(line.discountAmount)
    const discount = percentDiscount + fixedDiscount
    const baseNet = discount <= gross ? gross - discount : 0n
    return { gross, percentDiscount, fixedDiscount, discount, baseNet }
  })
  const subtotal = entries.reduce((sum, entry) => sum + entry.gross, 0n)
  const lineDiscount = entries.reduce((sum, entry) => sum + entry.discount, 0n)
  const lineNet = entries.reduce((sum, entry) => sum + entry.baseNet, 0n)
  const invoiceDiscountPercentBasis = parsePercent(options.discountPercent || '0') ?? 0n
  const invoicePercentDiscount = percentOf(lineNet, invoiceDiscountPercentBasis)
  const invoiceFixedDiscount = rial(options.discountAmount)
  const invoiceDiscount = invoicePercentDiscount + invoiceFixedDiscount
  const allocations = allocateRial(invoiceDiscount, entries.map((entry) => entry.baseNet))
  const rows = entries.map((entry, index) => {
    const net = entry.baseNet > allocations[index] ? entry.baseNet - allocations[index] : 0n
    const taxBasis = parsePercent(lines[index].taxPercent || '0') ?? 0n
    const tax = percentOf(net, taxBasis)
    return { ...entry, invoiceDiscount: allocations[index], net, tax, total: net + tax }
  })
  const netTotal = rows.reduce((sum, row) => sum + row.net, 0n)
  const tax = rows.reduce((sum, row) => sum + row.tax, 0n)
  const freight = rial(options.freightAmount)
  const preRounding = netTotal + tax + freight
  const unit = BigInt(options.roundingUnit || 1)
  let total = preRounding
  if (unit > 1n) {
    if (options.roundingMethod === 'UP') total = ((preRounding + unit - 1n) / unit) * unit
    else if (options.roundingMethod === 'DOWN') total = preRounding / unit * unit
    else total = (preRounding + unit / 2n) / unit * unit
  }
  return {
    rows, subtotal, lineDiscount, lineNet, invoicePercentDiscount, invoiceFixedDiscount,
    invoiceDiscount, netTotal, tax, freight, rounding: total - preRounding, total,
  }
}

export function calculatePurchaseOrderLine(line) {
  const gross = quantityPrice(line.quantity, line.unitPrice)
  const basis = parsePercent(line.discountPercent || '0') ?? 0n
  const percentDiscount = percentOf(gross, basis)
  const fixedDiscount = rial(line.discountAmount)
  const discount = percentDiscount + fixedDiscount
  return { gross, percentDiscount, fixedDiscount, discount, total: discount <= gross ? gross - discount : 0n }
}
