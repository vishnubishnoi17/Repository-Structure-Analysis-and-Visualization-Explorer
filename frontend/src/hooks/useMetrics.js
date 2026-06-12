import { useQuery } from '@tanstack/react-query'
import { getFileMetrics } from '../services/api'

export function useFileMetrics(fileRef) {
  return useQuery({
    queryKey: ['metrics', fileRef?.sessionId, fileRef?.relPath, fileRef?.path],
    queryFn: () => getFileMetrics(fileRef),
    enabled: !!fileRef && (!!fileRef.path || (!!fileRef.sessionId && !!fileRef.relPath)),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}
