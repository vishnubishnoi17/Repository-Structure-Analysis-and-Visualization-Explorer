import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const client = axios.create({
  baseURL: BASE,
  timeout: 120000,
})

function buildFileParams(fileRef) {
  if (!fileRef) return {}
  if (fileRef.sessionId && fileRef.relPath) {
    return {
      session_id: fileRef.sessionId,
      rel_path: fileRef.relPath,
    }
  }
  if (fileRef.path) {
    return { path: fileRef.path }
  }
  return {}
}

export async function scanRepo(path, options = {}) {
  const { data } = await client.post('/repo/scan', {
    path,
    max_depth: options.maxDepth ?? 10,
    exclude_dirs: options.excludeDirs ?? null,
  })
  return data
}

export async function readFile(fileRef) {
  const { data } = await client.get('/repo/file', {
    params: buildFileParams(fileRef),
  })
  return data
}

export async function analyzeFile(fileLabel, fileContent, forceRefresh = false) {
  const ext = fileLabel.split('.').pop()
  const langMap = {
    py: 'Python', js: 'JavaScript', ts: 'TypeScript',
    jsx: 'React JSX', tsx: 'React TSX', go: 'Go',
    rs: 'Rust', java: 'Java', cpp: 'C++', c: 'C',
  }
  const { data } = await client.post('/ai/analyze', {
    file_path: fileLabel,
    file_content: fileContent,
    language: langMap[ext] ?? null,
    force_refresh: forceRefresh,
  })
  return data
}

export async function chatAboutFile(fileLabel, fileContent, question) {
  const { data } = await client.post('/ai/chat', {
    file_path: fileLabel,
    file_content: fileContent,
    question,
  })
  return data
}

export async function uploadRepo(zipBlob, options = {}) {
  const form = new FormData()
  form.append('file', zipBlob, 'project.zip')
  const params = new URLSearchParams()
  if (options.maxDepth) params.set('max_depth', options.maxDepth)
  const { data } = await client.post(`/repo/upload?${params}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  })
  return data
}

export async function getFileMetrics(fileRef) {
  const { data } = await client.get('/metrics/file', {
    params: buildFileParams(fileRef),
  })
  return data
}
