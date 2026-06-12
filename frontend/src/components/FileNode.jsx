import React, { memo } from 'react'
import { Handle, Position } from 'reactflow'
import '../styles/nodes.css'

const EXT_ICON = {
  '.py': '🐍', '.js': '🟨', '.ts': '🔷', '.jsx': '⚛️', '.tsx': '⚛️',
  '.go': '🐹', '.rs': '🦀', '.java': '☕', '.cpp': '⚙️', '.c': '⚙️',
  '.css': '🎨', '.scss': '🎨', '.html': '🌐', '.vue': '💚', '.svelte': '🔥',
  '.json': '📋', '.yaml': '📄', '.yml': '📄', '.md': '📝', '.sh': '💲',
  '.env': '🔑', '.toml': '📄', '.rb': '💎', '.php': '🐘',
}

const GROUP_COLOR = {
  python:     '#3b82f6',
  javascript: '#f59e0b',
  typescript: '#06b6d4',
  style:      '#a78bfa',
  markup:     '#34d399',
  config:     '#6b7280',
  c_cpp:      '#ef4444',
  go:         '#00add8',
  rust:       '#f97316',
  java:       '#ec4899',
  docs:       '#64748b',
  other:      '#475569',
}

function locClass(loc) {
  if (loc > 500) return 'file-node__loc--danger'
  if (loc > 200) return 'file-node__loc--warn'
  return ''
}

function locLabel(loc) {
  if (loc == null) return ''
  return `${loc} loc`
}

function FileNode({ data, selected }) {
  const color = GROUP_COLOR[data.group] ?? '#475569'
  const icon = EXT_ICON[data.extension] ?? '📄'

  return (
    <div className={`file-node${selected ? ' file-node--selected' : ''}`}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />

      <div className="file-node__stripe" style={{ background: color }} />

      <div className="file-node__body">
        <div className="file-node__name-row">
          <span className="file-node__icon">{icon}</span>
          <span className="file-node__name" title={data.rel_path}>
            {data.label}
          </span>
        </div>
        <div className="file-node__meta">
          <span className={`file-node__loc ${locClass(data.loc)}`}>
            {locLabel(data.loc)}
          </span>
          {data.depth > 0 && (
            <span className="file-node__depth">d{data.depth}</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  )
}

export default memo(FileNode)
