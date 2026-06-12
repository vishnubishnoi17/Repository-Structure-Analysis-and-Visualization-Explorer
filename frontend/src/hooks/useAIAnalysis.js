import { useCallback } from 'react'
import { readFile, analyzeFile, chatAboutFile } from '../services/api'
import { useGraphStore } from '../store/graphStore'

export function useAIAnalysis() {
  const { setAiSummary, setAiLoading, setAiError } = useGraphStore()

  const analyze = useCallback(async (filePath, forceRefresh = false) => {
    if (!filePath) return
    setAiLoading(true)
    setAiError(null)
    try {
      const { content } = await readFile(filePath)
      const result = await analyzeFile(filePath, content, forceRefresh)
      setAiSummary(result.summary)
      return result
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? 'AI analysis failed'
      setAiError(msg)
    }
  }, [setAiSummary, setAiLoading, setAiError])

  const chat = useCallback(async (filePath, question) => {
    if (!filePath || !question) return
    try {
      const { content } = await readFile(filePath)
      const result = await chatAboutFile(filePath, content, question)
      return result.answer
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? 'Chat failed'
      throw new Error(msg)
    }
  }, [])

  return { analyze, chat }
}
