import hashlib
import json
import os
import time
from pathlib import Path
from typing import Optional


CACHE_DIR = Path(__file__).parent.parent.parent / ".cache" / "ai_summaries"
CACHE_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


class CacheService:
    """
    File-system based cache for AI summaries.
    Key = SHA256(file_content) so a file is re-analyzed only when its content changes.
    """

    def __init__(self):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self._hits = 0
        self._misses = 0

    def _key_to_path(self, content_hash: str) -> Path:
        # Use first 2 chars as subdirectory (sharding) to avoid huge flat dirs
        shard = content_hash[:2]
        return CACHE_DIR / shard / f"{content_hash}.json"

    def _hash(self, content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def get(self, file_content: str) -> Optional[str]:
        h = self._hash(file_content)
        path = self._key_to_path(h)

        if not path.exists():
            self._misses += 1
            return None

        try:
            data = json.loads(path.read_text())
            # Check TTL
            if time.time() - data.get("timestamp", 0) > CACHE_TTL_SECONDS:
                path.unlink(missing_ok=True)
                self._misses += 1
                return None
            self._hits += 1
            return data["summary"]
        except Exception:
            self._misses += 1
            return None

    def set(self, file_content: str, summary: str) -> None:
        h = self._hash(file_content)
        path = self._key_to_path(h)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "hash": h,
            "summary": summary,
            "timestamp": time.time(),
        }
        path.write_text(json.dumps(data, indent=2))

    def clear(self) -> None:
        import shutil
        if CACHE_DIR.exists():
            shutil.rmtree(CACHE_DIR)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self._hits = 0
        self._misses = 0

    def stats(self) -> dict:
        total = self._hits + self._misses
        # Count cached files
        cached_count = sum(1 for _ in CACHE_DIR.rglob("*.json"))
        return {
            "total_requests": total,
            "cache_hits": self._hits,
            "cache_misses": self._misses,
            "hit_rate": round(self._hits / total * 100, 1) if total else 0,
            "cached_files": cached_count,
            "cache_dir": str(CACHE_DIR),
        }
