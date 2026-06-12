import os
import fnmatch
from pathlib import Path
from typing import Optional
from app.core.models import FileNode


# Files we care about for dependency analysis
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx",
    ".c", ".cpp", ".h", ".hpp",
    ".java", ".go", ".rs", ".kt", ".kts", ".swift",
    ".css", ".scss", ".less",
    ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
    ".md", ".txt", ".env", ".sql", ".graphql", ".gql",
    ".html", ".vue", ".svelte", ".xml",
    ".rb", ".php", ".sh",
}

SUPPORTED_FILENAMES = {
    "Dockerfile",
    "Makefile",
    "Procfile",
    ".gitignore",
    ".dockerignore",
}

ALWAYS_EXCLUDE = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    ".mypy_cache", ".pytest_cache", "dist", "build",
    ".next", ".nuxt", "coverage", ".nyc_output",
    "target",  # Rust/Java build dir
}


class RepoScanner:
    def __init__(
        self,
        root_path: str,
        max_depth: int = 10,
        exclude_dirs: Optional[list] = None,
    ):
        self.root = Path(root_path).resolve()
        self.max_depth = max_depth
        self.exclude_dirs = set(exclude_dirs or []) | ALWAYS_EXCLUDE

    def scan(self) -> list[FileNode]:
        """Traverse the directory tree and collect all relevant files."""
        nodes = []
        self._traverse(self.root, depth=0, nodes=nodes)
        return nodes

    def _traverse(self, path: Path, depth: int, nodes: list):
        if depth > self.max_depth:
            return

        try:
            entries = sorted(path.iterdir())
        except PermissionError:
            return

        for entry in entries:
            # Skip excluded directories
            if entry.is_dir():
                if entry.name in self.exclude_dirs:
                    continue
                self._traverse(entry, depth + 1, nodes)

            elif entry.is_file():
                if (
                    entry.suffix.lower() not in SUPPORTED_EXTENSIONS
                    and entry.name not in SUPPORTED_FILENAMES
                ):
                    continue
                if self._is_ignored(entry):
                    continue

                node = self._build_node(entry)
                nodes.append(node)

    def _build_node(self, path: Path) -> FileNode:
        rel_path = path.relative_to(self.root)
        stat = path.stat()

        # Read content to count lines (we need it for metrics anyway)
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
            lines = content.splitlines()
            loc = len(lines)
        except Exception:
            content = ""
            loc = 0

        return FileNode(
            id=str(rel_path).replace(os.sep, "/"),
            abs_path=str(path),
            rel_path=str(rel_path).replace(os.sep, "/"),
            name=path.name,
            extension=path.suffix.lower(),
            size_bytes=stat.st_size,
            loc=loc,
            depth=len(rel_path.parts) - 1,
            parent=str(rel_path.parent).replace(os.sep, "/")
            if rel_path.parent != Path(".")
            else None,
            content_preview=content[:500] if content else "",
        )

    def _is_ignored(self, path: Path) -> bool:
        """Check .gitignore-style patterns (basic support)."""
        gitignore = self.root / ".gitignore"
        if not gitignore.exists():
            return False

        rel = str(path.relative_to(self.root))
        try:
            with open(gitignore) as f:
                patterns = [
                    line.strip()
                    for line in f
                    if line.strip() and not line.startswith("#")
                ]
            return any(fnmatch.fnmatch(rel, p) for p in patterns)
        except Exception:
            return False

    def get_tree(self) -> dict:
        """Returns a nested dict tree (lightweight, no content)."""

        def build_subtree(path: Path, depth: int) -> dict:
            if depth > self.max_depth:
                return {}
            node = {"name": path.name, "type": "dir" if path.is_dir() else "file"}
            if path.is_dir() and path.name not in self.exclude_dirs:
                try:
                    children = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name))
                    node["children"] = [
                        build_subtree(c, depth + 1)
                        for c in children
                        if c.name not in self.exclude_dirs
                    ]
                except PermissionError:
                    node["children"] = []
            return node

        return build_subtree(self.root, 0)
