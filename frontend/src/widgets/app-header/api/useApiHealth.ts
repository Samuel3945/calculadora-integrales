import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '@/shared/api'
import { HEALTH_REFETCH_MS } from '@/shared/config'

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: HEALTH_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
