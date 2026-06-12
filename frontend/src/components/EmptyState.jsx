import React, { useRef } from 'react'
import { useRepoGraph } from '../hooks/useRepoGraph'
import { useGraphStore } from '../store/graphStore'

// Small, focused repos — 10-20 files each, scan fast, look great in the graph
const EXAMPLES = [
  {
    url: 'https://github.com/pallets/itsdangerous',
    label: 'pallets/itsdangerous',
    desc: 'Compact Python library with clear modules',
    lang: 'Python',
    color: '#5b7bff',
  },
  {
    url: 'https://github.com/sindresorhus/is',
    label: 'sindresorhus/is',
    desc: 'Typed JavaScript type checks with good import structure',
    lang: 'JS',
    color: '#f6a623',
  },
  {
    url: 'https://github.com/simonw/shot-scraper',
    label: 'simonw/shot-scraper',
    desc: 'CLI screenshot tool · Python',
    lang: 'Python',
    color: '#5b7bff',
  },
  {
    url: 'https://github.com/realpython/codetiming',
    label: 'realpython/codetiming',
    desc: 'Flexible Python timer · ~15 files',
    lang: 'Python',
    color: '#5b7bff',
  },
  {
    url: 'https://github.com/charmbracelet/harmonica',
    label: 'charmbracelet/harmonica',
    desc: 'Spring animation lib · Go',
    lang: 'Go',
    color: '#00acd7',
  },
  {
    url: 'https://github.com/lodash/lodash',
    label: 'lodash/lodash',
    desc: 'Familiar JavaScript utility codebase for demos',
    lang: 'JS',
    color: '#f6a623',
  },
]

const LANG_COLORS = {
  JS: '#f6a623',
  Python: '#5b7bff',
  Go: '#00acd7',
  Markdown: '#3ecf8e',
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.venv', 'venv',
  'dist', 'build', '.next', '.cache', 'target', 'out',
  '.mypy_cache', '.pytest_cache', 'coverage',
])

function shouldSkip(relativePath) {
  const parts = relativePath.split('/')
  return parts.some(p => SKIP_DIRS.has(p))
}

async function filesToZip(fileList) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const files = Array.from(fileList)
  let added = 0
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

export default function EmptyState() {
  const { scan, uploadAndScan } = useRepoGraph()
  const { isLoading, setScanError } = useGraphStore()
  const folderInputRef = useRef(null)

  function configureFolderInput(node) {
    folderInputRef.current = node
    if (!node) return
    node.setAttribute('webkitdirectory', '')
    node.setAttribute('directory', '')
  }

  function fillInput(url) {
    const input = document.querySelector('.toolbar__path-input')
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, url)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    // auto-scan immediately
    scan(url)
  }

  async function handleFolderSelect(e) {
    const files = e.target.files
    if (!files || files.length === 0) return
    e.target.value = ''
    try {
      const zipBlob = await filesToZip(files)
      await uploadAndScan(zipBlob)
    } catch (err) {
      setScanError(err.message || 'Local upload failed')
    }
  }

  return (
    <div className="empty-state">
      <div className="empty-state__grid" />
      <div className="empty-state__content">

        <div className="empty-state__hero">
          <div className="empty-state__hex">⬡</div>
          <h1 className="empty-state__title">Visualize any codebase</h1>
          <p className="empty-state__sub">
            Paste a GitHub URL in the toolbar and hit <kbd>Scan</kbd> — or drop your local project below.
          </p>
        </div>

        {/* Two input modes */}
        <div className="empty-state__modes">
          <div className="empty-state__mode">
            <div className="empty-state__mode-icon">⎆</div>
            <div className="empty-state__mode-text">
              <div className="empty-state__mode-title">GitHub Repo</div>
              <div className="empty-state__mode-desc">Paste any public GitHub URL in the toolbar above</div>
            </div>
          </div>
          <div className="empty-state__mode-sep">or</div>
          <div
            className="empty-state__mode empty-state__mode--upload"
            onClick={() => folderInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && folderInputRef.current?.click()}
          >
            <div className="empty-state__mode-icon">⬆</div>
            <div className="empty-state__mode-text">
              <div className="empty-state__mode-title">Local Folder</div>
              <div className="empty-state__mode-desc">Click to select a project folder from your machine</div>
            </div>
          </div>
        </div>

        <input
          ref={configureFolderInput}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderSelect}
        />

        {/* Example repos */}
        <div className="empty-state__examples">
          <div className="empty-state__example-label">Quick examples — small repos, fast scans</div>
          <div className="empty-state__example-grid">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.url}
                className="empty-state__example-card"
                onClick={() => fillInput(ex.url)}
                disabled={isLoading}
              >
                <span
                  className="empty-state__lang-badge"
                  style={{ background: LANG_COLORS[ex.lang] + '22', color: LANG_COLORS[ex.lang] }}
                >
                  {ex.lang}
                </span>
                <div className="empty-state__card-label">{ex.label}</div>
                <div className="empty-state__card-desc">{ex.desc}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
