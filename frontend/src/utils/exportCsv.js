export function downloadCsv(filename, headers, rows) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const content = [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
