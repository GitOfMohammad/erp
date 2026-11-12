import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

const asText = value => value == null ? '' : String(value)
const escapeHtml = value => asText(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const xml = value => asText(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
const colName = index => { let value = index + 1, result = ''; while (value) { const remainder = (value - 1) % 26; result = String.fromCharCode(65 + remainder) + result; value = Math.floor((value - 1) / 26) } return result }
const cleanSheetName = value => String(value || 'Sheet1').replace(/[\\/*?:\[\]]/g, ' ').slice(0, 31) || 'Sheet1'

function cellXml(value, reference, style = '') {
  if (value == null || value === '') return `<c r="${reference}"${style}/>`
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}" t="n"${style}><v>${value}</v></c>`
  const text = asText(value)
  // Keep identifier-like strings (phone numbers, barcodes, references) as text
  // when they contain leading zeroes; Excel would otherwise silently strip them.
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text) && text.replace(/[-.]/g, '').length <= 15) return `<c r="${reference}" t="n"${style}><v>${text}</v></c>`
  return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(text)}</t></is></c>`
}

function worksheetXml(sheet, index) {
  const rows = sheet.rows || []
  const headerRow = Number.isInteger(sheet.headerRowIndex) ? sheet.headerRowIndex : 0
  const maxColumns = Math.max(1, ...rows.map(row => row.length))
  const widths = sheet.widths || []
  const cols = widths.length ? `<cols>${widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(80, Math.max(10, Number(width) || 14))}" customWidth="1"/>`).join('')}</cols>` : ''
  const sheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${Array.from({ length: Math.max(maxColumns, row.length) }, (_, columnIndex) => cellXml(row[columnIndex], `${colName(columnIndex)}${rowIndex + 1}`, rowIndex === headerRow && sheet.headerStyle ? ' s="1"' : '')).join('')}</row>`).join('')
  const lastRef = `${colName(maxColumns - 1)}${Math.max(1, rows.length)}`
  const views = sheet.rightToLeft === false ? '' : `<sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="${headerRow + 1}" topLeftCell="A${headerRow + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
  const autoFilter = sheet.autoFilter && rows.length > headerRow + 1 ? `<autoFilter ref="A${headerRow + 1}:${colName(maxColumns - 1)}${rows.length}"/>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lastRef}"/>${views}${cols}<sheetFormatPr defaultRowHeight="20"/><sheetData>${sheetRows}</sheetData>${autoFilter}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`
}

export async function saveXlsxSheets(sheets, filename) {
  const safeSheets = sheets.map((sheet, index) => ({ ...sheet, name: cleanSheetName(sheet.name || `Sheet${index + 1}`) }))
  if (!safeSheets.length) throw new Error('کاربرگ Excel برای ذخیره وجود ندارد')
  const types = safeSheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  const sheetEntries = safeSheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')
  const sheetRels = safeSheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')
  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${types}</Types>`),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheetEntries}</sheets><calcPr calcId="191029"/></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Vazirmatn"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Vazirmatn"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF24324A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'),
  }
  safeSheets.forEach((sheet, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet, index)) })
  const bytes = zipSync(files, { level: 6 })
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadExcel(filename, sheetName, headers, rows, { subtitle = '', summary = [] } = {}) {
  const prepared = [
    [sheetName],
    ...(subtitle ? [[subtitle]] : []),
    [`تاریخ تهیه: ${new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'long' }).format(new Date())}`],
    [],
    headers,
    ...rows,
  ]
  const summaryRows = summary.length ? [[], ['خلاصه گزارش'], ...summary.map(([label, value]) => [label, value])] : []
  return saveXlsxSheets([{ name: sheetName, rows: [...prepared, ...summaryRows], widths: headers.map(() => 22), autoFilter: true, headerStyle: true, headerRowIndex: prepared.length - rows.length - 1 }], filename)
}

const localName = node => node.localName || node.nodeName.split(':').pop()
function elementsByName(parent, name) { return [...parent.getElementsByTagName('*')].filter(node => localName(node) === name) }
function columnIndex(reference) { const letters = String(reference || '').match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'A'; let index = 0; for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64; return index - 1 }
function normalizeZipPath(path) { const parts = []; for (const part of path.split('/')) { if (!part || part === '.') continue; if (part === '..') parts.pop(); else parts.push(part) } return parts.join('/') }

export function readXlsxWorkbook(buffer) {
  const files = unzipSync(new Uint8Array(buffer))
  const textFile = path => files[path] ? strFromU8(files[path]) : null
  const parser = new DOMParser()
  const workbookXml = textFile('xl/workbook.xml')
  const relsXml = textFile('xl/_rels/workbook.xml.rels')
  if (!workbookXml || !relsXml) throw new Error('ساختار فایل Excel معتبر نیست')
  const workbookDoc = parser.parseFromString(workbookXml, 'application/xml')
  const relsDoc = parser.parseFromString(relsXml, 'application/xml')
  const relationships = new Map(elementsByName(relsDoc, 'Relationship').map(item => [item.getAttribute('Id'), item.getAttribute('Target')]))
  const sheets = elementsByName(workbookDoc, 'sheet').map(item => ({ name: item.getAttribute('name'), target: relationships.get(item.getAttribute('r:id')) || item.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') }))
  const sharedXml = textFile('xl/sharedStrings.xml')
  const shared = sharedXml ? elementsByName(parser.parseFromString(sharedXml, 'application/xml'), 'si').map(item => elementsByName(item, 't').map(node => node.textContent || '').join('')) : []
  return sheets.map(sheet => {
    const path = normalizeZipPath(sheet.target?.startsWith('/') ? sheet.target.slice(1) : `xl/${sheet.target || ''}`)
    const source = textFile(path)
    if (!source) return { name: sheet.name, rows: [] }
    const doc = parser.parseFromString(source, 'application/xml')
    const rows = elementsByName(doc, 'row').map(rowNode => {
      const cells = []
      for (const cell of elementsByName(rowNode, 'c')) {
        const index = columnIndex(cell.getAttribute('r'))
        const type = cell.getAttribute('t')
        let value = ''
        if (type === 'inlineStr') value = elementsByName(cell, 't').map(node => node.textContent || '').join('')
        else { const valueNode = elementsByName(cell, 'v')[0]; value = valueNode?.textContent || ''; if (type === 's') value = shared[Number(value)] ?? '' }
        cells[index] = value
      }
      return cells.map(value => value ?? '')
    })
    return { name: sheet.name, rows }
  })
}

export function printPdf(title, headers, rows, { subtitle = '', summary = [], targetWindow = null } = {}) {
  const printWindow = targetWindow || window.open('', '_blank')
  if (!printWindow) return false
  printWindow.opener = null
  const head = headers.map(value => `<th>${escapeHtml(value)}</th>`).join('')
  const body = rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')
  const totals = summary.length ? `<section class="summary">${summary.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</section>` : ''
  printWindow.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font-family:Vazirmatn,Tahoma,Arial,sans-serif;color:#172033;margin:0;font-size:10pt}header{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #24324a;padding-bottom:10px;margin-bottom:16px}h1{font-size:18pt;margin:0}p{margin:4px 0 0;color:#596579}.brand{font-weight:700;color:#24324a}.meta{font-size:9pt;color:#596579;margin:8px 0 14px}table{width:100%;border-collapse:collapse;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #aeb8c6;padding:6px 7px;text-align:right;vertical-align:top;overflow-wrap:anywhere}th{background:#e9edf3;font-weight:700}tbody tr:nth-child(even){background:#f7f8fa}.summary{margin-top:14px;display:flex;gap:24px;flex-wrap:wrap}.summary div{display:flex;gap:7px}.foot{margin-top:18px;padding-top:7px;border-top:1px solid #aeb8c6;font-size:8pt;color:#687387}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><header><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="brand">راهکار | سیستم ERP</div></header><div class="meta">تاریخ تهیه: ${escapeHtml(new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'long' }).format(new Date()))} · تعداد ردیف: ${new Intl.NumberFormat('fa-IR').format(rows.length)}</div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${totals}<div class="foot">این گزارش بر اساس اطلاعات نمایش‌داده‌شده در سامانه تهیه شده است.</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))</script></body></html>`)
  printWindow.document.close()
  return true
}
