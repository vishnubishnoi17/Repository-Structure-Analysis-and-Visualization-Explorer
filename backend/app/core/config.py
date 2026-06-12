from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── AI API ────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GITHUB_TOKEN: str = ""

    # ── Server ───────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True             # Set False in production

    # ── Cache ─────────────────────────────────────────────────────────────────
    CACHE_TTL_DAYS: int = 7

    # ── Scanning ──────────────────────────────────────────────────────────────
    MAX_SCAN_DEPTH: int = 10
    MAX_FILE_SIZE_KB: int = 500     # Skip files larger than this for content parsing

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
