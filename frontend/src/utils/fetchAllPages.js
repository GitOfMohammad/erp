import { api, unwrap } from '../services/api'
import { fetchAllPagesFrom, readPageWithRetry } from './fetchAllPagesCore'

const readPage = (url, options) => readPageWithRetry(async target => unwrap(await api.get(target)), url, options)

export { fetchAllPagesFrom }

export async function fetchAllPages(url, options) {
  return fetchAllPagesFrom(readPage, url, options)
}
