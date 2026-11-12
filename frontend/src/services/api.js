import axios from 'axios'
import { store, setSession, clearSession } from '../store/store'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', timeout: 20000, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use((config) => {
  const token = store.getState().session.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
let refreshing
api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config
  if (error.response?.status !== 401 || original?._retried || original?.url?.includes('/auth/')) return Promise.reject(error)
  const refreshToken = store.getState().session.refreshToken
  if (!refreshToken) { store.dispatch(clearSession()); return Promise.reject(error) }
  original._retried = true
  try {
    refreshing ||= api.post('/auth/refresh', { refreshToken }).then((r) => r.data.details).finally(() => { refreshing = null })
    const result = await refreshing
    store.dispatch(setSession({ accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken }))
    original.headers.Authorization = `Bearer ${result.tokens.accessToken}`
    return api(original)
  } catch (refreshError) {
    store.dispatch(clearSession())
    return Promise.reject(refreshError)
  }
})
export const unwrap = (response) => response.data?.details ?? response.data
export const getErrorMessage = (error) => error.response?.data?.message || error.message || 'ارتباط با سرور برقرار نشد'
