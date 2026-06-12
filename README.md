# RepoViz — Repository Structure Visualizer

Interactive graph-based visualization of any codebase. Scan GitHub repos or local directories, explore file dependencies, and get AI-powered summaries via Gemini.

## Stack

- **Backend**: FastAPI + Python 3.11+
- **Frontend**: React 18 + React Flow + Zustand + Vite
- **AI**: Google Gemini 1.5 Flash (optional)

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — add GEMINI_API_KEY (optional) and GITHUB_TOKEN (optional)

python run.py
# → http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Usage

- Paste a **GitHub URL** (`https://github.com/owner/repo` or `owner/repo`) to clone and visualize
- Paste a **local directory path** to visualize a repo on disk
- Click any file node to open the side panel with metrics and AI analysis
- Use `Ctrl+K` / `Cmd+K` to focus search

## Configuration

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Enables AI file summaries. Get free at [aistudio.google.com](https://aistudio.google.com) |
| `GITHUB_TOKEN` | Optional | Raises GitHub API rate limit from 60→5000 req/hr for private repos |

## Features

- **Dependency graph** — visualizes imports between files (Python, JS/TS, C/C++, Go, Rust)
- **Code metrics** — LoC, complexity, function/class counts per file
- **AI summaries** — Gemini-powered plain-English file explanations
- **AI chat** — ask questions about any file
- **Search** — `Ctrl+K` to search files by name or path
- **GitHub support** — shallow-clones any public repo automatically

## Deployment Notes

For production, set `RELOAD=false` in backend `.env` and build the frontend:

```bash
cd frontend && npm run build
# Serve the dist/ folder with nginx or a static host
# Point VITE_API_BASE_URL to your deployed backend
```
