import React, { useState, useRef } from 'react'
import { useRepoGraph } from '../hooks/useRepoGraph'
import { useGraphStore } from '../store/graphStore'
import SearchBar from './SearchBar'

// Excluded dirs/files when zipping locally
const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.venv', 'venv',
  'dist', 'build', '.next', '.cache', 'target', 'out',
  '.mypy_cache', '.pytest_cache', 'coverage',
])

function shouldSkip(relativePath) {
  const parts = relativePath.split('/')
  return parts.some(p => SKIP_DIRS.has(p) || p.startsWith('.'))
}

async function filesToZip(fileList) {
  // Lazy-load JSZip from the installed package
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  let added = 0
  const files = Array.from(fileList)

  for (const file of files) {
    const rel = file.webkitRelativePath || file.name
    if (shouldSkip(rel)) continue
    const buf = await file.arrayBuffer()
    zip.file(rel, buf)
    added += 1
  }

  if (added === 0) {
    throw new Error('No uploadable files found in the selected folder')
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } })
}

export default function Toolbar() {
  const { scan, uploadAndScan } = useRepoGraph()
  const { isLoading, scanError, nodes, edges, setScanError } = useGraphStore()
  const [path, setPath] = useState('')
  const [uploadStatus, setUploadStatus] = useState(null) // null | 'zipping' | 'uploading'
  const folderInputRef = useRef(null)

  function configureFolderInput(node) {
    folderInputRef.current = node
    if (!node) return
    node.setAttribute('webkitdirectory', '')
    node.setAttribute('directory', '')
  }

  async function handleScan(e) {
    e.preventDefault()
    if (!path.trim()) return
    await scan(path.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleScan(e)
  }

  async function handleFolderSelect(e) {
    const files = e.target.files
    if (!files || files.length === 0) return
    // Reset input so same folder can be re-selected
    e.target.value = ''

    try {
      setUploadStatus('zipping')
      const zipBlob = await filesToZip(files)
      setUploadStatus('uploading')
      await uploadAndScan(zipBlob)
    } catch (err) {
      setScanError(err.message || 'Local upload failed')
    } finally {
      setUploadStatus(null)
    }
  }

  const uploadLabel = uploadStatus === 'zipping'
    ? 'Zipping…'
    : uploadStatus === 'uploading'
    ? 'Uploading…'
    : '⬆ Local'

  const busy = isLoading || uploadStatus !== null

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
          placeholder="github.com/owner/repo"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          className={`toolbar__scan-btn${isLoading ? ' loading' : ''}`}
          type="submit"
          disabled={busy || !path.trim()}
        >
          {isLoading ? 'Scanning…' : 'Scan'}
        </button>
      </form>

      {/* Local folder upload */}
      <input
        ref={configureFolderInput}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderSelect}
      />
      <button
        className={`toolbar__upload-btn${uploadStatus ? ' loading' : ''}`}
        onClick={() => folderInputRef.current?.click()}
        disabled={busy}
        title="Upload a local project folder"
      >
        {uploadLabel}
      </button>

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
