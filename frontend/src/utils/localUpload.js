const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.venv', 'venv',
  'dist', 'build', '.next', '.cache', 'target', 'out',
  '.mypy_cache', '.pytest_cache', 'coverage',
])

function splitPath(relativePath) {
  return String(relativePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
}

function normalizeFileListPath(relativePath) {
  const parts = splitPath(relativePath)
  if (parts.length <= 1) return parts.join('/')
  return parts.slice(1).join('/')
}

function shouldSkip(relativePath) {
  const parts = splitPath(relativePath)
  return parts.some((part) => SKIP_DIRS.has(part))
}

async function collectEntriesFromDirectoryHandle(handle, prefix = '') {
  const entries = []

  for await (const child of handle.values()) {
    if (child.kind === 'directory') {
      if (SKIP_DIRS.has(child.name)) continue
      const nestedPrefix = prefix ? `${prefix}/${child.name}` : child.name
      const nestedEntries = await collectEntriesFromDirectoryHandle(child, nestedPrefix)
      entries.push(...nestedEntries)
      continue
    }

    const relativePath = prefix ? `${prefix}/${child.name}` : child.name
    if (shouldSkip(relativePath)) continue
    const file = await child.getFile()
    entries.push({ relativePath, file })
  }

  return entries
}

function collectEntriesFromFileList(fileList) {
  return Array.from(fileList || [])
    .map((file) => {
      const sourcePath = file.webkitRelativePath || file.name
      const relativePath = normalizeFileListPath(sourcePath)
      return { relativePath, file }
    })
    .filter(({ relativePath }) => relativePath && !shouldSkip(relativePath))
}

export async function zipProjectEntries(entries) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  let added = 0

  for (const { relativePath, file } of entries) {
    const buf = await file.arrayBuffer()
    zip.file(relativePath, buf)
    added += 1
  }

  if (added === 0) {
    throw new Error('No uploadable files found in the selected folder')
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  })
}

export function zipFilesFromFileList(fileList) {
  return zipProjectEntries(collectEntriesFromFileList(fileList))
}

export async function zipFilesFromDirectoryPicker() {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    return null
  }

  const handle = await window.showDirectoryPicker()
  const entries = await collectEntriesFromDirectoryHandle(handle)
  return zipProjectEntries(entries)
}

