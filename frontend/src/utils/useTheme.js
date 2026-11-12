import { useEffect, useState } from 'react'

const KEY = 'erp.theme'
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(KEY) || 'light')
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem(KEY, theme) }, [theme])
  return [theme, () => setTheme((v) => v === 'light' ? 'dark' : 'light')]
}
