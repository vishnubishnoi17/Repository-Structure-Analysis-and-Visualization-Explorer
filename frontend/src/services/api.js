import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const client = axios.create({
  baseURL: BASE,
  timeout: 120000,
})

export async function scanRepo(path, options = {}) {
  const { data } = await client.post('/repo/scan', {
    path,
    max_depth: options.maxDepth ?? 10,
    exclude_dirs: options.excludeDirs ?? null,
  })
  return data
}

export async function readFile(path) {
  const { data } = await client.get('/repo/file', { params: { path } })
  return data
}

export async function analyzeFile(filePath, fileContent, forceRefresh = false) {
  const ext = filePath.split('.').pop()
  const langMap = {
    py: 'Python', js: 'JavaScript', ts: 'TypeScript',
    jsx: 'React JSX', tsx: 'React TSX', go: 'Go',
    rs: 'Rust', java: 'Java', cpp: 'C++', c: 'C',
  }
  const { data } = await client.post('/ai/analyze', {
    file_path: filePath,
    file_content: fileContent,
    language: langMap[ext] ?? null,
    force_refresh: forceRefresh,
  })
  return data
}

export async function chatAboutFile(filePath, fileContent, question) {
  const { data } = await client.post('/ai/chat', {
    file_path: filePath,
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

export async function getFileMetrics(path) {
  const { data } = await client.get('/metrics/file', { params: { path } })
  return data
}
