import { useCallback } from 'react'
import { readFile, analyzeFile, chatAboutFile } from '../services/api'
import { useGraphStore } from '../store/graphStore'

export function useAIAnalysis() {
  const { setAiSummary, setAiLoading, setAiError } = useGraphStore()

  const analyze = useCallback(async (fileRef, forceRefresh = false) => {
    if (!fileRef) return
    setAiLoading(true)
    setAiError(null)
    try {
      const { content } = await readFile(fileRef)
      const result = await analyzeFile(
        fileRef.displayPath ?? fileRef.relPath ?? fileRef.path ?? 'file',
        content,
        forceRefresh
      )
      setAiSummary(result.summary)
      return result
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? 'AI analysis failed'
      setAiError(msg)
    }
  }, [setAiSummary, setAiLoading, setAiError])

  const chat = useCallback(async (fileRef, question) => {
    if (!fileRef || !question) return
    try {
      const { content } = await readFile(fileRef)
      const result = await chatAboutFile(
        fileRef.displayPath ?? fileRef.relPath ?? fileRef.path ?? 'file',
        content,
        question
      )
      return result.answer
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? 'Chat failed'
      throw new Error(msg)
    }
  }, [])

  return { analyze, chat }
}
