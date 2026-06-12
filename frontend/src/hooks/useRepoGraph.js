import { useCallback } from 'react'
import { scanRepo } from '../services/api'
import { useGraphStore } from '../store/graphStore'

export function useRepoGraph() {
  const { setGraph, setLoading, setScanError } = useGraphStore()

  const scan = useCallback(async (path, options = {}) => {
    setLoading(true)
    setScanError(null)
    try {
      const result = await scanRepo(path, options)
      setGraph(result.graph.nodes, result.graph.edges, result.base_path)
      return result
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? 'Scan failed'
      setScanError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setGraph, setLoading, setScanError])

  return { scan }
}
