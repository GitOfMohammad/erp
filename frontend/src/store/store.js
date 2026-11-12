import { configureStore, createSlice } from '@reduxjs/toolkit'

const saved = (() => { try { return JSON.parse(localStorage.getItem('erp.session') || 'null') } catch { return null } })()
const sessionSlice = createSlice({
  name: 'session', initialState: saved || { user: null, accessToken: null, refreshToken: null },
  reducers: {
    setSession: (state, action) => ({ ...state, ...action.payload }),
    setUser: (state, action) => ({ ...state, user: action.payload }),
    clearSession: () => ({ user: null, accessToken: null, refreshToken: null }),
  },
})
export const { setSession, setUser, clearSession } = sessionSlice.actions
export const store = configureStore({ reducer: { session: sessionSlice.reducer } })
store.subscribe(() => {
  const s = store.getState().session
  if (s.accessToken) localStorage.setItem('erp.session', JSON.stringify(s))
  else localStorage.removeItem('erp.session')
})
