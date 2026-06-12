import React, { useEffect, useState } from 'react'
import { useGraphStore } from '../store/graphStore'
import { useAIAnalysis } from '../hooks/useAIAnalysis'
import { useFileMetrics } from '../hooks/useMetrics'

const EXT_ICON = {
  '.py': '🐍', '.js': '🟨', '.ts': '🔷', '.jsx': '⚛️', '.tsx': '⚛️',
  '.go': '🐹', '.rs': '🦀', '.java': '☕', '.cpp': '⚙️', '.c': '⚙️',
  '.css': '🎨', '.scss': '🎨', '.html': '🌐', '.json': '📋', '.md': '📝',
  '.yaml': '📄', '.yml': '📄', '.vue': '💚', '.sh': '💲', '.env': '🔑',
}

const GROUP_COLOR = {
  python: '#3b82f6', javascript: '#f59e0b', typescript: '#06b6d4',
  style: '#a78bfa', markup: '#34d399', config: '#6b7280',
  c_cpp: '#ef4444', go: '#00add8', rust: '#f97316', java: '#ec4899',
  docs: '#64748b', other: '#475569',
}

function MetricsBadge({ label, value }) {
  return (
    <div className="metrics-badge">
      <span className="metrics-badge__value">{value ?? '—'}</span>
      <span className="metrics-badge__label">{label}</span>
    </div>
  )
}

export default function SidePanel({ node }) {
  const { aiSummary, aiLoading, aiError, clearSelection } = useGraphStore()
  const { analyze, chat } = useAIAnalysis()
  const fileRef = node
    ? {
        path: node.data.abs_path ?? null,
        relPath: node.data.rel_path,
        sessionId: node.data.sessionId ?? null,
        displayPath: node.data.rel_path,
      }
    : null
  const { data: metrics, isLoading: metricsLoading } = useFileMetrics(fileRef)
  const [question, setQuestion] = useState('')
  const [chatAnswer, setChatAnswer] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)
 
  useEffect(() => {
    setChatAnswer(null)
    setQuestion('')
  }, [node?.id])

  if (!node) return null

  const icon = EXT_ICON[node.data.extension] ?? '📄'
  const color = GROUP_COLOR[node.data.group] ?? '#475569'
  const canInspect = !!fileRef && (!!fileRef.path || (!!fileRef.sessionId && !!fileRef.relPath))
  const sourceLabel = node.data.sourceType === 'github'
    ? 'GitHub snapshot'
    : node.data.sourceType === 'upload'
    ? 'Uploaded workspace'
    : 'Local workspace'

  async function handleChat(e) {
    e.preventDefault()
    if (!question.trim() || !canInspect) return
    setChatLoading(true)
    setChatAnswer(null)
    try {
      const answer = await chat(fileRef, question)
      setChatAnswer(answer)
    } catch (err) {
      setChatAnswer(`Error: ${err.message}`)
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <aside className="side-panel">
      <div className="side-panel__header">
        <div className="side-panel__icon" style={{ background: color + '22' }}>
          {icon}
        </div>
        <div className="side-panel__header-text">
          <div className="side-panel__title">{node.data.label}</div>
          <div className="side-panel__path">{node.data.rel_path}</div>
          <div className="side-panel__source">{sourceLabel}</div>
        </div>
        <button className="side-panel__close" onClick={clearSelection} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="side-panel__scroll">
        {/* Metrics */}
        <div className="side-panel__section">
          <div className="side-panel__section-title">Metrics</div>
          {metricsLoading ? (
            <div style={{ color: 'var(--text-2)', fontSize: 11 }}>Loading…</div>
          ) : metrics ? (
            <div className="metrics-grid">
              <MetricsBadge label="Total LoC" value={metrics.loc_total} />
              <MetricsBadge label="Code" value={metrics.loc_code} />
              <MetricsBadge label="Comments" value={metrics.loc_comment} />
              <MetricsBadge label="Complexity" value={metrics.cyclomatic_complexity} />
              <MetricsBadge label="Functions" value={metrics.function_count} />
              <MetricsBadge label="Classes" value={metrics.class_count} />
            </div>
          ) : (
            <div style={{ color: 'var(--text-2)', fontSize: 11 }}>
              Metrics unavailable for this file
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="ai-section">
          <div className="ai-section__header">
            <div className="ai-section__title">
              <span className="ai-section__spark">✨</span>
              AI Summary
            </div>
            <button
              className="ai-section__trigger"
              onClick={() => canInspect && analyze(fileRef, aiSummary != null)}
              disabled={aiLoading || !canInspect}
            >
              {aiLoading ? 'Analyzing…' : aiSummary ? '↺ Refresh' : 'Analyze'}
            </button>
          </div>

          {!canInspect && (
            <p style={{ color: 'var(--text-2)', fontSize: 11 }}>
              This file is not available for inspection in the current session.
            </p>
          )}

          {aiLoading && (
            <div className="ai-section__loading">
              <div className="ai-section__spinner" />
              Analyzing with Gemini…
            </div>
          )}

          {aiError && (
            <div className="ai-section__error">{aiError}</div>
          )}

          {aiSummary && !aiLoading && (
            <div className="ai-section__summary">{aiSummary}</div>
          )}
        </div>

        {/* Chat */}
        {canInspect && (
          <div className="chat-section">
            <div className="chat-section__title">Ask about this file</div>
            <form className="chat-section__form" onSubmit={handleChat}>
              <input
                className="chat-section__input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What does the main function do?"
              />
              <button
                className="chat-section__btn"
                type="submit"
                disabled={chatLoading || !question.trim()}
              >
                {chatLoading ? '…' : 'Ask'}
              </button>
            </form>
            {chatAnswer && (
              <div className="chat-section__answer">{chatAnswer}</div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
