import React, { useState, useRef } from 'react'
import { useRepoGraph } from '../hooks/useRepoGraph'
import { useGraphStore } from '../store/graphStore'
import SearchBar from './SearchBar'
import { zipFilesFromDirectoryPicker, zipFilesFromFileList } from '../utils/localUpload'

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
      const zipBlob = await zipFilesFromFileList(files)
      setUploadStatus('uploading')
      await uploadAndScan(zipBlob)
    } catch (err) {
      setScanError(err.message || 'Local upload failed')
    } finally {
      setUploadStatus(null)
    }
  }

  async function handleUploadClick() {
    if (busy) return

    if (typeof window.showDirectoryPicker !== 'function') {
      folderInputRef.current?.click()
      return
    }

    try {
      setUploadStatus('zipping')
      const zipBlob = await zipFilesFromDirectoryPicker()
      if (!zipBlob) {
        folderInputRef.current?.click()
        return
      }
      setUploadStatus('uploading')
      await uploadAndScan(zipBlob)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setScanError(err.message || 'Local upload failed')
      }
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
        onClick={handleUploadClick}
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
