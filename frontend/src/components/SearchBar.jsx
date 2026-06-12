import React, { useState, useRef, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const { nodes, selectNode } = useGraphStore()
  const inputRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setQuery('')
        setResults([])
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleSearch(e) {
    const q = e.target.value
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    const hits = nodes
      .filter((n) =>
        n.data.label.toLowerCase().includes(q.toLowerCase()) ||
        n.data.rel_path.toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 10)
    setResults(hits)
  }

  function pick(node) {
    selectNode(node)
    setQuery('')
    setResults([])
  }

  const EXT_ICON = {
    '.py':'🐍', '.js':'🟨', '.ts':'🔷', '.jsx':'⚛️', '.tsx':'⚛️',
    '.go':'🐹', '.rs':'🦀', '.java':'☕', '.cpp':'⚙️', '.c':'⚙️',
    '.css':'🎨', '.html':'🌐', '.json':'📋', '.md':'📝',
  }

  return (
    <div className="search-bar">
      <span className="search-bar__icon">⌕</span>
      <input
        ref={inputRef}
        className="search-bar__input"
        value={query}
        onChange={handleSearch}
        placeholder="Search files…"
        spellCheck={false}
      />
      {results.length > 0 && (
        <ul className="search-bar__results">
          {results.map((n) => (
            <li key={n.id} className="search-bar__result" onClick={() => pick(n)}>
              <span>{EXT_ICON[n.data.extension] ?? '📄'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.data.rel_path}
              </span>
              <span className="search-bar__result-ext">{n.data.extension.replace('.', '')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
