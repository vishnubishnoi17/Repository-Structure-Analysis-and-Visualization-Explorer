import math
from collections import defaultdict
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
        positions = self._build_positions(files)
        nodes = [self._make_node(f, positions[f.id]) for f in files]
        edges = self._make_edges(deps, {f.id for f in files})

        return {"nodes": nodes, "edges": edges}

    def _make_node(self, file: FileNode, position: tuple[float, float]) -> dict:
        return {
            "id": file.id,
            "type": "fileNode",
            "position": {
                "x": position[0],
                "y": position[1],
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
                "directory": file.parent or "root",
            },
        }

    def _build_positions(self, files: list[FileNode]) -> dict[str, tuple[float, float]]:
        by_depth: dict[int, list[FileNode]] = defaultdict(list)
        for file in sorted(files, key=lambda item: (item.depth, item.parent or "", item.name)):
            by_depth[file.depth].append(file)

        positions: dict[str, tuple[float, float]] = {}
        column_gap = 320
        row_gap = 122
        directory_gap = 52

        for depth, group in by_depth.items():
            y_offset = 0
            grouped_by_parent: dict[str, list[FileNode]] = defaultdict(list)
            for file in group:
                grouped_by_parent[file.parent or "root"].append(file)

            for parent in sorted(grouped_by_parent):
                siblings = grouped_by_parent[parent]
                for index, file in enumerate(siblings):
                    loc_factor = min(max(file.loc, 20), 400)
                    x_jitter = math.sin(index + depth) * 18
                    y = y_offset + index * row_gap
                    positions[file.id] = (
                        depth * column_gap + (loc_factor / 400) * 40 + x_jitter,
                        y,
                    )
                y_offset += max(len(siblings) * row_gap, row_gap) + directory_gap

        return positions

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
