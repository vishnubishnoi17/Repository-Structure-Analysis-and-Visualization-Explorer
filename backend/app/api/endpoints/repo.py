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


# ── Local upload endpoint ─────────────────────────────────────────────────────

from fastapi import UploadFile, File
import zipfile
import tempfile

@router.post("/upload")
async def upload_repository(
    file: UploadFile = File(...),
    max_depth: int = 10,
):
    """
    Accept a ZIP of a local project, extract to temp dir, scan & return graph.
    Frontend zips the folder client-side using JSZip, sends here.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    tmp_dir = tempfile.mkdtemp(prefix="repoviz_upload_")
    try:
        # Save uploaded zip
        zip_path = os.path.join(tmp_dir, "upload.zip")
        content = await file.read()
        with open(zip_path, "wb") as f:
            f.write(content)

        # Extract
        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir)
        with zipfile.ZipFile(zip_path, "r") as zf:
            # Security: skip absolute paths and path traversal
            for member in zf.namelist():
                member_path = os.path.realpath(os.path.join(extract_dir, member))
                if not member_path.startswith(os.path.realpath(extract_dir)):
                    continue
                zf.extract(member, extract_dir)

        # If zip has a single top-level folder, use it as root
        entries = os.listdir(extract_dir)
        if len(entries) == 1 and os.path.isdir(os.path.join(extract_dir, entries[0])):
            scan_root = os.path.join(extract_dir, entries[0])
        else:
            scan_root = extract_dir

        scanner = RepoScanner(scan_root, max_depth=max_depth, exclude_dirs=EXCLUDE_DEFAULTS)
        files = scanner.scan()

        if len(files) > 2000:
            raise HTTPException(
                status_code=422,
                detail=f"Project has {len(files)} files — too large (max 2000). Try a subdirectory.",
            )

        parser = DependencyParser()
        file_deps = parser.parse_all(files)

        builder = GraphBuilder()
        graph = builder.build(files, file_deps, base_path=scan_root)

        for node in graph["nodes"]:
            node["data"].pop("abs_path", None)

        return {
            "status": "success",
            "base_path": os.path.basename(scan_root),
            "node_count": len(graph["nodes"]),
            "edge_count": len(graph["edges"]),
            "graph": graph,
        }
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
