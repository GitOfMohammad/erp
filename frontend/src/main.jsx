import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { store } from './store/store'
import App from './App'
import '@fontsource/vazirmatn/300.css'
import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/600.css'
import '@fontsource/vazirmatn/700.css'
import '@fontsource/vazirmatn/800.css'
import './styles/app.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}><QueryClientProvider client={queryClient}><BrowserRouter><App /></BrowserRouter><Toaster position="top-center" richColors closeButton /></QueryClientProvider></Provider>
  </React.StrictMode>,
)

