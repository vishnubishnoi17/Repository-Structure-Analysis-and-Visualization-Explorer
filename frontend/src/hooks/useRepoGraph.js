import { useCallback } from 'react'
import { scanRepo, uploadRepo } from '../services/api'
import { useGraphStore } from '../store/graphStore'

export function useRepoGraph() {
  const { setGraph, setLoading, setScanError } = useGraphStore()

  const scan = useCallback(async (path, options = {}) => {
    setLoading(true)
    setScanError(null)
    try {
      const result = await scanRepo(path, options)
      setGraph(result.graph.nodes, result.graph.edges, {
        basePath: result.base_path,
        repoLabel: result.display_name,
        sourceType: result.source_type,
        sessionId: result.session_id,
      })
      return result
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? 'Scan failed'
      setScanError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setGraph, setLoading, setScanError])

  const uploadAndScan = useCallback(async (zipBlob, options = {}) => {
    setLoading(true)
    setScanError(null)
    try {
      const result = await uploadRepo(zipBlob, options)
      setGraph(result.graph.nodes, result.graph.edges, {
        basePath: result.base_path,
        repoLabel: result.display_name,
        sourceType: result.source_type,
        sessionId: result.session_id,
      })
      return result
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? 'Upload failed'
      setScanError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setGraph, setLoading, setScanError])

  return { scan, uploadAndScan }
}
