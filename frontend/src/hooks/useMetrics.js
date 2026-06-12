import { useQuery } from '@tanstack/react-query'
import { getFileMetrics } from '../services/api'

export function useFileMetrics(filePath) {
  return useQuery({
    queryKey: ['metrics', filePath],
    queryFn: () => getFileMetrics(filePath),
    enabled: !!filePath,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}
