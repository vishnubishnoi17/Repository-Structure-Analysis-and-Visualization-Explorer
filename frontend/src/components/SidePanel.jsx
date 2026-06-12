import React, { useState } from 'react'
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
  const { data: metrics, isLoading: metricsLoading } = useFileMetrics(node?.data?.abs_path)
  const [question, setQuestion] = useState('')
  const [chatAnswer, setChatAnswer] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [prevNodeId, setPrevNodeId] = useState(null)

  // Reset chat when node changes (without auto-triggering AI)
  if (node?.id !== prevNodeId) {
    setPrevNodeId(node?.id)
    setChatAnswer(null)
    setQuestion('')
  }

  if (!node) return null

  const icon = EXT_ICON[node.data.extension] ?? '📄'
  const color = GROUP_COLOR[node.data.group] ?? '#475569'
  const absPath = node.data.abs_path

  async function handleChat(e) {
    e.preventDefault()
    if (!question.trim() || !absPath) return
    setChatLoading(true)
    setChatAnswer(null)
    try {
      const answer = await chat(absPath, question)
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
              {absPath ? 'Metrics unavailable for remote repos' : 'No metrics'}
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
              onClick={() => absPath && analyze(absPath, aiSummary != null)}
              disabled={aiLoading || !absPath}
              title={!absPath ? 'AI analysis requires a local path' : ''}
            >
              {aiLoading ? 'Analyzing…' : aiSummary ? '↺ Refresh' : 'Analyze'}
            </button>
          </div>

          {!absPath && (
            <p style={{ color: 'var(--text-2)', fontSize: 11 }}>
              AI analysis is available for local repositories only.
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
        {absPath && (
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
