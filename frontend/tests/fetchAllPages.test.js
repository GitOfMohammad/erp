import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchAllPagesFrom, readPageWithRetry } from '../src/utils/fetchAllPagesCore.js'

test('fetchAllPagesFrom replaces pagination parameters, preserves filters, and reads sequentially', async () => {
  const requests = []
  let active = 0
  let maxActive = 0
  const readPage = async url => {
    active += 1
    maxActive = Math.max(maxActive, active)
    requests.push(url)
    await Promise.resolve()
    active -= 1
    const parsed = new URL(url, 'http://localhost')
    const page = Number(parsed.searchParams.get('page'))
    return page === 1
      ? { items: [{ id: 'a' }], pagination: { totalPages: 3 } }
      : page === 2
        ? { rows: [{ id: 'b' }], pagination: { totalPages: 3 } }
        : { items: [{ id: 'c' }], pagination: { totalPages: 3 } }
  }

  const rows = await fetchAllPagesFrom(readPage, '/records?search=test&page=9&limit=4', { limit: 2, delay: 0 })

  assert.deepEqual(rows, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  assert.equal(requests.length, 3)
  assert.equal(maxActive, 1)
  for (const [index, url] of requests.entries()) {
    const parsed = new URL(url, 'http://localhost')
    assert.equal(parsed.searchParams.get('search'), 'test')
    assert.equal(parsed.searchParams.get('page'), String(index + 1))
    assert.equal(parsed.searchParams.get('limit'), '2')
  }
})

test('fetchAllPagesFrom returns an empty list when the API reports zero pages', async () => {
  const rows = await fetchAllPagesFrom(async () => ({ items: [], pagination: { totalPages: 0 } }), '/records', { delay: 0 })
  assert.deepEqual(rows, [])
})

test('fetchAllPagesFrom rejects page counts above the configured ceiling', async () => {
  let calls = 0
  await assert.rejects(
    fetchAllPagesFrom(async () => { calls += 1; return { items: [], pagination: { totalPages: 4 } } }, '/records', { maxPages: 3, delay: 0 }),
    /سقف مجاز/,
  )
  assert.equal(calls, 1)
})

test('fetchAllPagesFrom rejects inconsistent zero-page responses containing rows', async () => {
  await assert.rejects(
    fetchAllPagesFrom(async () => ({ items: [{ id: 'unexpected' }], pagination: { totalPages: 0 } }), '/records', { delay: 0 }),
    /سقف مجاز/,
  )
})

test('readPageWithRetry honors numeric Retry-After for 429 responses', async () => {
  let calls = 0
  const waits = []
  const result = await readPageWithRetry(async () => {
    calls += 1
    if (calls < 3) throw { response: { status: 429, headers: { 'retry-after': '2' } } }
    return { items: [{ id: 'ready' }] }
  }, '/records', { wait: async milliseconds => waits.push(milliseconds) })

  assert.deepEqual(result, { items: [{ id: 'ready' }] })
  assert.equal(calls, 3)
  assert.deepEqual(waits, [2000, 2000])
})

test('readPageWithRetry does not retry non-429 errors and stops after its retry limit', async () => {
  let calls = 0
  const serverError = { response: { status: 503 } }
  await assert.rejects(readPageWithRetry(async () => { calls += 1; throw serverError }, '/records', { wait: async () => {} }), error => error === serverError)
  assert.equal(calls, 1)

  calls = 0
  const rateLimitError = { status: 429 }
  await assert.rejects(readPageWithRetry(async () => { calls += 1; throw rateLimitError }, '/records', { retries: 2, wait: async () => {} }), error => error === rateLimitError)
  assert.equal(calls, 3)
})
