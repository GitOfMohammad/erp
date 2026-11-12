const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export async function readPageWithRetry(request, url, { retries = 4, wait = pause, now = Date.now } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request(url)
    } catch (error) {
      if ((error.response?.status !== 429 && error.status !== 429) || attempt >= retries) throw error
      const retryAfter = error.response?.headers?.['retry-after']
      const retryAfterMs = retryAfter && Number.isFinite(Number(retryAfter))
        ? Number(retryAfter) * 1000
        : retryAfter ? Math.max(0, Date.parse(retryAfter) - now()) : 0
      await wait(Math.min(30_000, Math.max(retryAfterMs, 1000 * (2 ** attempt))))
    }
  }
}

/** Pure page collector so pagination behavior can be tested without HTTP or a browser. */
export async function fetchAllPagesFrom(readPage, url, { limit = 100, delay = 180, maxPages = 1000 } = {}) {
  const [path, search = ''] = url.split('?')
  const params = new URLSearchParams(search)
  params.set('page', '1')
  params.set('limit', String(limit))
  const pageUrl = page => { params.set('page', String(page)); return `${path}?${params.toString()}` }
  const first = await readPage(pageUrl(1))
  const all = Array.isArray(first) ? [...first] : [...(first?.items || first?.rows || [])]
  const totalPages = Number(first?.pagination?.totalPages ?? 1)
  if (!Number.isSafeInteger(totalPages) || totalPages < 0 || totalPages > maxPages || (totalPages === 0 && all.length > 0)) {
    throw new Error(`تعداد صفحه‌های خروجی از سقف مجاز (${maxPages}) بیشتر است`)
  }
  if (totalPages === 0) return all
  for (let page = 2; page <= totalPages; page += 1) {
    await pause(delay)
    const result = await readPage(pageUrl(page))
    all.push(...(Array.isArray(result) ? result : result?.items || result?.rows || []))
  }
  return all
}
