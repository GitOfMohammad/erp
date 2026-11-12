import test from 'node:test'
import assert from 'node:assert/strict'
import { printPdf, saveXlsxSheets } from '../src/utils/exportDocuments.js'
import { strFromU8, unzipSync } from 'fflate'

test('Excel export produces a readable RTL workbook and preserves identifier text', async () => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  let generatedBlob
  let clickedAnchor

  try {
    URL.createObjectURL = blob => { generatedBlob = blob; return 'blob:test-workbook' }
    URL.revokeObjectURL = () => {}
    globalThis.window = { setTimeout: () => 0 }
    globalThis.document = {
      createElement: tag => {
        assert.equal(tag, 'a')
        return { click() { clickedAnchor = this }, remove() {} }
      },
      body: { append() {} },
    }

    await saveXlsxSheets([{
      name: 'کالاها',
      rows: [['کد', 'نام'], ['00123', 'کالای آزمایشی']],
      widths: [18, 32],
      autoFilter: true,
      headerStyle: true,
      rightToLeft: true,
    }], 'products.xlsx')

    assert.ok(generatedBlob instanceof Blob)
    assert.equal(clickedAnchor?.download, 'products.xlsx')
    const files = unzipSync(new Uint8Array(await generatedBlob.arrayBuffer()))
    const workbook = strFromU8(files['xl/workbook.xml'])
    const worksheet = strFromU8(files['xl/worksheets/sheet1.xml'])
    assert.match(workbook, /name="کالاها"/)
    assert.match(worksheet, /rightToLeft="1"/)
    assert.match(worksheet, /t="inlineStr"[^>]*><is><t xml:space="preserve">00123<\/t>/)
    assert.match(worksheet, /کالای آزمایشی/)
  } finally {
    globalThis.document = originalDocument
    globalThis.window = originalWindow
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  }
})

test('PDF print output uses A4 landscape and escapes cell content', () => {
  let written = ''
  const printWindow = { opener: {}, document: { write(html) { written = html }, close() {} } }
  const opened = printPdf('گزارش آزمایشی', ['عنوان'], [['<script>alert(1)</script>']], {
    subtitle: 'زیرعنوان',
    summary: [['تعداد', '۱']],
    targetWindow: printWindow,
  })

  assert.equal(opened, true)
  assert.equal(printWindow.opener, null)
  assert.match(written, /@page\{size:A4 landscape/)
  assert.match(written, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(written, /<td><script>/)
  assert.match(written, /گزارش آزمایشی/)
  assert.match(written, /تعداد/)
})
