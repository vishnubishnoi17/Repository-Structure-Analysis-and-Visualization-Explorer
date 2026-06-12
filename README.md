# RepoViz

Interactive repository visualizer for GitHub repos and local codebases.

RepoViz scans a project, builds a dependency-aware file graph, shows file metrics, and lets you inspect files with Gemini-powered summaries and Q&A. It is designed to run locally for development and to be deployable as a portfolio or project-submission app.

## What It Does

- Scan a public GitHub repository by URL or `owner/repo`
- Upload a local project folder directly from the browser
- Render a visual file graph with custom nodes and dependency edges
- Show file metrics such as LoC, comments, complexity, functions, and classes
- Search files quickly with `Ctrl+K` or `Cmd+K`
- Run AI summaries and file-level chat with Gemini
- Keep scanned repos available through backend sessions so preview, metrics, and AI keep working after scan

## Stack

Frontend:
- React
- Vite
- React Flow
- Zustand
- Axios
- JSZip
- TanStack Query

Backend:
- FastAPI
- Pydantic
- Pydantic Settings
- HTTPX
- Python Multipart

AI:
- Google Gemini via the Generative Language API

## Architecture

Frontend responsibilities:
- Accept repo URL input and local folder uploads
- Store graph state and selected file state
- Render the graph canvas and side panel
- Call API endpoints for scanning, metrics, file reads, and AI

Backend responsibilities:
- Clone GitHub repos to temporary workspaces
- Accept uploaded ZIP archives from the browser
- Scan files and build graph nodes
- Parse project-local dependencies
- Hold active repo sessions for later file access
- Calculate metrics
- Proxy file content into Gemini prompts

## Main Features

### 1. GitHub Scanning

Paste any public GitHub URL such as:

```text
https://github.com/pallets/itsdangerous
github.com/sindresorhus/is
owner/repo
```

The backend shallow-clones the repo, scans supported files, builds the graph, and exposes the repo through a session so file metrics and AI still work after loading.

### 2. Local Folder Upload

Choose a folder from your machine. The browser zips it with JSZip and uploads it to the backend.

Excluded directories:

```text
node_modules
.git
__pycache__
.venv
venv
dist
build
.next
.cache
target
out
.mypy_cache
.pytest_cache
coverage
```

Unlike earlier builds, hidden files such as `.env`, `.gitignore`, and files inside useful hidden folders are no longer blanket-filtered out before upload.

### 3. Graph Visualization

The graph is rendered with React Flow and includes:

- Custom file cards
- Type-based coloring
- Directory/depth-aware placement
- Zoom, pan, minimap, and selection
- Edge thinning for large graphs to preserve readability

### 4. Metrics

Per-file metrics include:

- Total lines
- Code lines
- Comment lines
- Blank lines
- Character count
- Cyclomatic complexity for Python and JS/TS
- Function count
- Class count

### 5. AI Analysis

Gemini can:

- Summarize a file in plain English
- Answer free-form questions about a file

The backend now:

- Uses `GEMINI_MODEL`, defaulting to `gemini-2.5-flash`
- Falls back across compatible Gemini Flash models
- Retries transient `429` and `5xx` failures
- Avoids leaking API keys in surfaced error messages

## Supported File Types

RepoViz currently scans these code and config formats:

```text
.py .js .mjs .cjs .ts .mts .cts .jsx .tsx
.c .cpp .h .hpp
.java .go .rs .kt .kts .swift
.css .scss .less
.json .yaml .yml .toml .ini .cfg .conf
.md .txt .env .sql .graphql .gql
.html .vue .svelte .xml
.rb .php .sh
Dockerfile Makefile Procfile .gitignore .dockerignore
```

## Project Structure

```text
repo-visualizer/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/
│   │   │   ├── ai.py
│   │   │   ├── metrics.py
│   │   │   └── repo.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── graph_builder.py
│   │   │   └── models.py
│   │   ├── services/
│   │   │   ├── ai_service.py
│   │   │   ├── cache_service.py
│   │   │   ├── dependency_parser.py
│   │   │   ├── github_fetcher.py
│   │   │   ├── metrics_service.py
│   │   │   ├── repo_scanner.py
│   │   │   └── session_service.py
│   │   └── main.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Overview

### `POST /api/v1/repo/scan`

Scan a GitHub repo URL or a local path when running backend locally.

Request:

```json
{
  "path": "https://github.com/pallets/itsdangerous",
  "max_depth": 10
}
```

### `POST /api/v1/repo/upload`

Upload a zipped local folder from the browser.

### `GET /api/v1/repo/file`

Read file contents either by:

- `path`
- `session_id + rel_path`

### `GET /api/v1/metrics/file`

Get metrics for a single file.

### `POST /api/v1/ai/analyze`

Generate a summary for a file.

### `POST /api/v1/ai/chat`

Ask a question about a file.

## Local Development

### 1. Install backend dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Create backend environment

Create `backend/.env`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
GITHUB_TOKEN=
HOST=0.0.0.0
PORT=8000
RELOAD=True
```

`GITHUB_TOKEN` is optional, but useful if GitHub rate-limits anonymous clones.

### 3. Run backend

```bash
cd backend
python3 run.py
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Run frontend

```bash
cd frontend
npm run dev
```

Frontend dev server:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:8000
```

## Production Notes

- `vite preview` is configured to proxy `/api` to the backend for local preview testing.
- The backend uses in-memory repo sessions with temporary workspace retention.
- Uploaded and cloned repos are not stored permanently.
- Large repositories are capped to protect responsiveness.
- Gemini calls depend on valid Google API credentials and provider availability.

Recommended for deployment:

- Set `RELOAD=False`
- Put the FastAPI app behind a reverse proxy
- Add tighter CORS allowlists
- Run with a process manager
- Rotate API keys immediately if they are ever exposed

## Validation

Checks used during final hardening:

```bash
cd frontend && npm run build
python3 -m compileall backend/app
```

## Known Limits

- Dependency parsing is regex-based, not full AST resolution for every language
- Very large monorepos may need scanning from a subdirectory
- AI quality depends on file size, provider health, and model availability

## Submission Summary

This version includes:

- Fixed toolbar/search layering after repo load
- Fixed local folder upload handling
- Broader file support for real-world repos
- Session-backed file access for metrics and AI
- More reliable Gemini model selection and retry behavior
- Updated UI shell and graph presentation
- Updated documentation aligned with the actual shipped code
