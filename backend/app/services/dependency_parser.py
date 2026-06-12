import re
from pathlib import Path
from typing import Optional
from app.core.models import FileNode, Dependency


# ── Language-specific import patterns ──────────────────────────────────────────
PATTERNS = {
    # Python: import foo / from foo import bar
    ".py": [
        re.compile(r"^\s*import\s+([\w.]+)", re.MULTILINE),
        re.compile(r"^\s*from\s+([\w.]+)\s+import", re.MULTILINE),
    ],
    # JavaScript / TypeScript / JSX / TSX
    ".js":  [re.compile(r"""(?:import|require)\s*(?:\{[^}]*\}\s*from\s*)?['"](\.{1,2}/[^'"]+)['"]""")],
    ".mjs": [re.compile(r"""(?:import|require)\s*(?:\{[^}]*\}\s*from\s*)?['"](\.{1,2}/[^'"]+)['"]""")],
    ".cjs": [re.compile(r"""(?:import|require)\s*(?:\{[^}]*\}\s*from\s*)?['"](\.{1,2}/[^'"]+)['"]""")],
    ".ts":  [re.compile(r"""import\s+.*?from\s+['"](\.{1,2}/[^'"]+)['"]""")],
    ".mts": [re.compile(r"""import\s+.*?from\s+['"](\.{1,2}/[^'"]+)['"]""")],
    ".cts": [re.compile(r"""import\s+.*?from\s+['"](\.{1,2}/[^'"]+)['"]""")],
    ".jsx": [re.compile(r"""import\s+.*?from\s+['"](\.{1,2}/[^'"]+)['"]""")],
    ".tsx": [re.compile(r"""import\s+.*?from\s+['"](\.{1,2}/[^'"]+)['"]""")],
    # C / C++
    ".c":   [re.compile(r'#include\s+"([^"]+)"')],
    ".cpp": [re.compile(r'#include\s+"([^"]+)"')],
    ".h":   [re.compile(r'#include\s+"([^"]+)"')],
    ".hpp": [re.compile(r'#include\s+"([^"]+)"')],
    # Go
    ".go":  [re.compile(r'"(\.{1,2}/[^"]+)"')],
    # Rust
    ".rs":  [re.compile(r'mod\s+(\w+)\s*;'), re.compile(r'use\s+([\w:]+)')],
    # CSS / SCSS
    ".css": [re.compile(r'@import\s+[\'"]([^\'"]+)[\'"]')],
    ".scss":[re.compile(r'@(?:import|use|forward)\s+[\'"]([^\'"]+)[\'"]')],
}


class DependencyParser:
    def __init__(self):
        self._id_index: dict[str, FileNode] = {}

    def parse_all(self, files: list[FileNode]) -> dict[str, list[Dependency]]:
        """
        Parse dependencies for every file.
        Returns {file_id: [Dependency, ...]}
        """
        # Build lookup by rel_path and name (for resolution)
        self._id_index = {f.rel_path: f for f in files}
        self._name_index = {}
        for f in files:
            self._name_index.setdefault(f.name, []).append(f)

        result: dict[str, list[Dependency]] = {}
        for file in files:
            deps = self._parse_file(file)
            if deps:
                result[file.id] = deps

        return result

    def _parse_file(self, file: FileNode) -> list[Dependency]:
        patterns = PATTERNS.get(file.extension, [])
        if not patterns:
            return []

        try:
            content = Path(file.abs_path).read_text(encoding="utf-8", errors="replace")
        except Exception:
            return []

        raw_matches = []
        for pattern in patterns:
            raw_matches.extend(pattern.findall(content))

        deps = []
        for match in raw_matches:
            resolved = self._resolve(match, file)
            deps.append(
                Dependency(
                    source=file.id,
                    target=resolved or match,
                    target_resolved=resolved,
                    raw_import=match,
                )
            )

        return deps

    def _resolve(self, raw: str, source: FileNode) -> Optional[str]:
        """
        Try to resolve a raw import string to a known file's rel_path.
        """
        # Relative path imports (JS/TS/Go style: ./foo or ../foo)
        if raw.startswith("."):
            source_dir = Path(source.rel_path).parent
            candidate = (source_dir / raw).resolve()
            # Try with and without extensions
            for ext in ["", ".py", ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx", ".go", ".rs"]:
                key = str(candidate).replace("\\", "/") + ext
                # Strip leading slash/cwd noise
                for rel in self._id_index:
                    if rel.endswith(key) or key.endswith(rel):
                        return rel

        # Python dot-notation (foo.bar.baz → foo/bar/baz.py)
        if "." in raw and not raw.startswith("."):
            path_guess = raw.replace(".", "/") + ".py"
            if path_guess in self._id_index:
                return path_guess
            # Try submodule __init__
            init_guess = raw.replace(".", "/") + "/__init__.py"
            if init_guess in self._id_index:
                return init_guess

        # Filename-only match (last resort)
        basename = Path(raw).name
        matches = self._name_index.get(basename, [])
        if len(matches) == 1:
            return matches[0].rel_path

        return None
