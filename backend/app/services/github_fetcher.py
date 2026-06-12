"""
GitHub repo fetcher — clones a public GitHub repo to a temp directory.
Supports URLs like:
  https://github.com/owner/repo
  https://github.com/owner/repo.git
  github.com/owner/repo
  owner/repo
"""

import re
import shutil
import subprocess
import tempfile
from pathlib import Path


GITHUB_RE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/([^/]+)/([^/\s]+?)(?:\.git)?/?$"
)
SHORT_RE = re.compile(r"^([A-Za-z0-9_.\-]+)/([A-Za-z0-9_.\-]+)$")


def parse_github_url(raw: str) -> tuple[str, str] | None:
    """Return (owner, repo) or None if not a GitHub URL."""
    raw = raw.strip()
    m = GITHUB_RE.match(raw)
    if m:
        return m.group(1), m.group(2)
    m = SHORT_RE.match(raw)
    if m:
        return m.group(1), m.group(2)
    return None


def is_github_input(raw: str) -> bool:
    return parse_github_url(raw) is not None


def clone_repo(owner: str, repo: str, github_token: str = "") -> Path:
    """
    Shallow-clone the repo into a fresh temp directory.
    Returns the path to the cloned directory.
    Raises RuntimeError on failure.
    """
    if github_token:
        clone_url = f"https://{github_token}@github.com/{owner}/{repo}.git"
    else:
        clone_url = f"https://github.com/{owner}/{repo}.git"

    tmp = Path(tempfile.mkdtemp(prefix=f"repoviz_{owner}_{repo}_"))

    try:
        result = subprocess.run(
            ["git", "clone", "--depth=1", "--single-branch", clone_url, str(tmp)],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            shutil.rmtree(tmp, ignore_errors=True)
            err = result.stderr.strip()
            raise RuntimeError(f"git clone failed: {err}")
    except subprocess.TimeoutExpired:
        shutil.rmtree(tmp, ignore_errors=True)
        raise RuntimeError("git clone timed out (>120s). Repo may be too large.")
    except FileNotFoundError:
        shutil.rmtree(tmp, ignore_errors=True)
        raise RuntimeError("git not found. Please install git.")

    return tmp
