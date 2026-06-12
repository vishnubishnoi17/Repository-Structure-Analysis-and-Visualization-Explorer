import shutil
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from threading import RLock
from typing import Optional


@dataclass
class RepoSession:
    session_id: str
    root_path: Path
    display_name: str
    source_type: str
    cleanup_path: Optional[Path]
    created_at: float
    last_accessed_at: float


class SessionService:
    def __init__(self, ttl_seconds: int = 60 * 60):
        self.ttl_seconds = ttl_seconds
        self._sessions: dict[str, RepoSession] = {}
        self._lock = RLock()

    def create_session(
        self,
        root_path: str,
        display_name: str,
        source_type: str,
        cleanup_path: Optional[str] = None,
    ) -> RepoSession:
        now = time.time()
        session = RepoSession(
            session_id=uuid.uuid4().hex,
            root_path=Path(root_path).resolve(),
            display_name=display_name,
            source_type=source_type,
            cleanup_path=Path(cleanup_path).resolve() if cleanup_path else None,
            created_at=now,
            last_accessed_at=now,
        )
        with self._lock:
            self._cleanup_expired_locked(now)
            self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[RepoSession]:
        now = time.time()
        with self._lock:
            self._cleanup_expired_locked(now)
            session = self._sessions.get(session_id)
            if session is None:
                return None
            session.last_accessed_at = now
            return session

    def resolve_file(self, session_id: str, rel_path: str) -> Path:
        session = self.get_session(session_id)
        if session is None:
            raise FileNotFoundError("Repository session expired or was not found")

        candidate = (session.root_path / rel_path).resolve()
        if not self._is_within_root(candidate, session.root_path):
            raise FileNotFoundError("Requested path is outside the repository root")
        if not candidate.exists() or not candidate.is_file():
            raise FileNotFoundError(f"File not found: {rel_path}")
        return candidate

    def _cleanup_expired_locked(self, now: float) -> None:
        expired_ids = [
            session_id
            for session_id, session in self._sessions.items()
            if now - session.last_accessed_at > self.ttl_seconds
        ]
        for session_id in expired_ids:
            self._delete_session_locked(session_id)

    def _delete_session_locked(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session and session.cleanup_path and session.cleanup_path.exists():
            shutil.rmtree(session.cleanup_path, ignore_errors=True)

    @staticmethod
    def _is_within_root(candidate: Path, root: Path) -> bool:
        try:
            candidate.relative_to(root)
            return True
        except ValueError:
            return False


session_service = SessionService()
