import React, { useState } from 'react'
import { useRepoGraph } from '../hooks/useRepoGraph'
import { useGraphStore } from '../store/graphStore'
import SearchBar from './SearchBar'

export default function Toolbar() {
  const { scan } = useRepoGraph()
  const { isLoading, scanError, nodes, edges } = useGraphStore()
  const [path, setPath] = useState('')

  async function handleScan(e) {
    e.preventDefault()
    if (!path.trim()) return
    await scan(path.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleScan(e)
  }

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <div className="toolbar__logo">⬡</div>
        <span className="toolbar__name">RepoViz</span>
      </div>

      <form className="toolbar__scan-form" onSubmit={handleScan}>
        <input
          className="toolbar__path-input"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="github.com/owner/repo  or  /local/path"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          className={`toolbar__scan-btn${isLoading ? ' loading' : ''}`}
          type="submit"
          disabled={isLoading || !path.trim()}
        >
          {isLoading ? 'Scanning…' : 'Scan'}
        </button>
      </form>

      {nodes.length > 0 && (
        <>
          <div className="toolbar__divider" />
          <div className="toolbar__stats">
            <span className="toolbar__stat">
              <span className="toolbar__stat-num">{nodes.length}</span> files
            </span>
            <span className="toolbar__stat">
              <span className="toolbar__stat-num">{edges.length}</span> deps
            </span>
          </div>
          <div className="toolbar__divider" />
          <SearchBar />
        </>
      )}

      {scanError && (
        <div className="toolbar__error" title={scanError}>⚠ {scanError}</div>
      )}
    </header>
  )
}
