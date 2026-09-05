import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // El backend limita a 100 req/15 min por IP: reintentar en bucle o
      // refetchear en cada foco gastaba ese presupuesto sin aportar nada.
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404 || status === 429) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Montado a nivel de app: antes vivía dentro de GuildSettings, así que
          los toasts del leaderboard y de los menús de roles nunca se veían. */}
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
