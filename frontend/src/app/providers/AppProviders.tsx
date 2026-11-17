import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { IntegralProvider } from '@/entities/integral'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: false },
          mutations: { retry: false },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <IntegralProvider>{children}</IntegralProvider>
    </QueryClientProvider>
  )
}
