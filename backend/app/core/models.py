from pydantic import BaseModel
from typing import Optional


class FileNode(BaseModel):
    id: str                         # relative path (unique key)
    abs_path: str
    rel_path: str
    name: str
    extension: str
    size_bytes: int
    loc: int
    depth: int
    parent: Optional[str] = None
    content_preview: str = ""


class Dependency(BaseModel):
    source: str                     # rel_path of the file containing the import
    target: str                     # raw or resolved target
    target_resolved: Optional[str]  # rel_path of resolved file (None if external/unresolved)
    raw_import: str                 # original import string as written in code
