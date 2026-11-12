import { useState } from 'react'
import { FiDownload, FiPrinter } from 'react-icons/fi'
import { toast } from 'sonner'
import { downloadExcel, printPdf } from '../utils/exportDocuments'

export default function DataExportActions({ title, headers, rows, loadRows, subtitle = '' }) {
  const [busy, setBusy] = useState(false)
  const exportAs = async format => {
    if ((!rows?.length && !loadRows) || busy) return
    // Open synchronously within the click event. Browsers may block a popup
    // opened only after the asynchronous, multi-page data load has finished.
    const printWindow = format === 'pdf' ? window.open('', '_blank') : null
    if (format === 'pdf' && !printWindow) { toast.error('اجازهٔ بازشدن پنجرهٔ چاپ را در مرورگر فعال کنید'); return }
    setBusy(true)
    try {
      const dataRows = loadRows ? await loadRows() : rows
      if (!dataRows?.length) { printWindow?.close(); toast.error('رکوردی برای خروجی پیدا نشد'); return }
      if (format === 'excel') await downloadExcel(`${title}-${new Date().toISOString().slice(0, 10)}`, title, headers, dataRows, { subtitle })
      else if (!printPdf(title, headers, dataRows, { subtitle, targetWindow: printWindow })) { printWindow?.close(); toast.error('ساخت پنجرهٔ چاپ انجام نشد') }
    } catch { printWindow?.close(); toast.error('ساخت خروجی انجام نشد') }
    finally { setBusy(false) }
  }
  return <div className="resource-export-actions"><button className="btn btn-secondary" type="button" onClick={() => exportAs('excel')} disabled={(!rows?.length && !loadRows) || busy} title="خروجی Excel"><FiDownload/> {busy ? 'در حال آماده‌سازی…' : 'Excel'}</button><button className="btn btn-secondary" type="button" onClick={() => exportAs('pdf')} disabled={(!rows?.length && !loadRows) || busy} title="چاپ یا ذخیره به‌صورت PDF"><FiPrinter/> PDF</button></div>
}
