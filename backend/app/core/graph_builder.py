import math
from app.core.models import FileNode, Dependency


# Color coding by file type (maps to frontend node colors)
EXT_GROUPS = {
    "python":     {".py"},
    "javascript": {".js", ".jsx"},
    "typescript": {".ts", ".tsx"},
    "style":      {".css", ".scss", ".less"},
    "markup":     {".html", ".vue", ".svelte"},
    "config":     {".json", ".yaml", ".yml", ".toml", ".env"},
    "c_cpp":      {".c", ".cpp", ".h", ".hpp"},
    "go":         {".go"},
    "rust":       {".rs"},
    "java":       {".java"},
    "docs":       {".md", ".txt"},
}


def get_group(extension: str) -> str:
    for group, exts in EXT_GROUPS.items():
        if extension in exts:
            return group
    return "other"


class GraphBuilder:
    def build(
        self,
        files: list[FileNode],
        deps: dict[str, list[Dependency]],
        base_path: str,
    ) -> dict:
        """
        Produce a React Flow-compatible graph:
        {
          nodes: [ { id, type, position, data } ... ],
          edges: [ { id, source, target, animated } ... ]
        }
        """
        nodes = [self._make_node(f, idx, len(files)) for idx, f in enumerate(files)]
        edges = self._make_edges(deps, {f.id for f in files})

        return {"nodes": nodes, "edges": edges}

    def _make_node(self, file: FileNode, idx: int, total: int) -> dict:
        # Lay out nodes in a spiral / grid so they don't all overlap
        cols = max(1, math.ceil(math.sqrt(total)))
        row = idx // cols
        col = idx % cols

        return {
            "id": file.id,
            "type": "fileNode",   # Custom React Flow node type
            "position": {
                "x": col * 220,
                "y": row * 160,
            },
            "data": {
                "label": file.name,
                "rel_path": file.rel_path,
                "abs_path": file.abs_path,
                "extension": file.extension,
                "group": get_group(file.extension),
                "loc": file.loc,
                "size_bytes": file.size_bytes,
                "depth": file.depth,
                "parent": file.parent,
                "content_preview": file.content_preview,
            },
        }

    def _make_edges(
        self,
        deps: dict[str, list[Dependency]],
        valid_ids: set[str],
    ) -> list[dict]:
        edges = []
        seen = set()

        for source_id, dep_list in deps.items():
            if source_id not in valid_ids:
                continue
            for dep in dep_list:
                target_id = dep.target_resolved
                if not target_id or target_id not in valid_ids:
                    continue
                if source_id == target_id:
                    continue

                edge_key = (source_id, target_id)
                if edge_key in seen:
                    continue
                seen.add(edge_key)

                edges.append({
                    "id": f"{source_id}→{target_id}",
                    "source": source_id,
                    "target": target_id,
                    "animated": False,
                    "data": {"raw_import": dep.raw_import},
                    "style": {"strokeWidth": 1.5},
                })

        return edges
