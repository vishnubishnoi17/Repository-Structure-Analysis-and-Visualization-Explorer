from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.services.repo_scanner import RepoScanner
from app.services.dependency_parser import DependencyParser
from app.services.github_fetcher import is_github_input, parse_github_url, clone_repo
from app.core.graph_builder import GraphBuilder
from app.core.config import settings
import os
import shutil

router = APIRouter()

EXCLUDE_DEFAULTS = [
    "node_modules", ".git", "__pycache__", ".venv",
    "venv", "dist", "build", ".next", ".cache",
]


class ScanRequest(BaseModel):
    path: str
    max_depth: Optional[int] = 10
    exclude_dirs: Optional[list[str]] = None


@router.post("/scan")
async def scan_repository(request: ScanRequest):
    """
    Scan a local directory path OR a GitHub URL / owner/repo shorthand.
    Returns React Flow-compatible graph without abs_path (safe for web use).
    """
    raw = request.path.strip()
    tmp_dir = None

    if is_github_input(raw):
        parsed = parse_github_url(raw)
        if not parsed:
            raise HTTPException(status_code=400, detail="Could not parse GitHub URL")
        owner, repo = parsed
        try:
            tmp_dir = clone_repo(
                owner, repo,
                github_token=getattr(settings, "GITHUB_TOKEN", ""),
            )
            path = str(tmp_dir)
        except RuntimeError as e:
            raise HTTPException(status_code=422, detail=str(e))
    else:
        path = os.path.expanduser(raw)
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")
        if not os.path.isdir(path):
            raise HTTPException(status_code=400, detail="Path must be a directory")

    try:
        exclude = request.exclude_dirs or EXCLUDE_DEFAULTS
        scanner = RepoScanner(path, max_depth=request.max_depth, exclude_dirs=exclude)
        files = scanner.scan()

        if len(files) > 2000:
            raise HTTPException(
                status_code=422,
                detail=f"Repo has {len(files)} files — too large to visualize (max 2000). Try a subdirectory or increase exclude_dirs.",
            )

        parser = DependencyParser()
        file_deps = parser.parse_all(files)

        builder = GraphBuilder()
        graph = builder.build(files, file_deps, base_path=path)

        # Strip abs_path from nodes (not needed client-side, minor security)
        for node in graph["nodes"]:
            node["data"].pop("abs_path", None)

        return {
            "status": "success",
            "base_path": path,
            "node_count": len(graph["nodes"]),
            "edge_count": len(graph["edges"]),
            "graph": graph,
        }
    finally:
        if tmp_dir is not None:
            shutil.rmtree(tmp_dir, ignore_errors=True)


@router.get("/tree")
async def get_file_tree(path: str = Query(...)):
    path = os.path.expanduser(path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Path not found")
    scanner = RepoScanner(path)
    return {"tree": scanner.get_tree()}


@router.get("/file")
async def read_file(path: str = Query(...)):
    path = os.path.expanduser(path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.isfile(path):
        raise HTTPException(status_code=400, detail="Path is not a file")
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return {
            "path": path,
            "filename": os.path.basename(path),
            "content": content,
            "size_bytes": os.path.getsize(path),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
