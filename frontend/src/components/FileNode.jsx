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
  python:     '#5d8cff',
  javascript: '#f2a93b',
  typescript: '#18b8d7',
  style:      '#ec7db8',
  markup:     '#41c28a',
  config:     '#7d8ca4',
  c_cpp:      '#f26d6d',
  go:         '#45c6e8',
  rust:       '#ff8f4d',
  java:       '#ff6ca8',
  docs:       '#7f8b9b',
  other:      '#59708a',
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
    <div
      className={`file-node${selected ? ' file-node--selected' : ''}`}
      style={{ '--node-accent': color }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />

      <div className="file-node__stripe" style={{ background: color }} />

      <div className="file-node__body">
        <div className="file-node__topline">
          <span className="file-node__group">{data.group.replace('_', ' ')}</span>
          <span className="file-node__ext">{data.extension.replace('.', '') || 'file'}</span>
        </div>
        <div className="file-node__name-row">
          <span className="file-node__icon">{icon}</span>
          <span className="file-node__name" title={data.rel_path}>
            {data.label}
          </span>
        </div>
        <div className="file-node__path" title={data.directory}>
          {data.directory}
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
