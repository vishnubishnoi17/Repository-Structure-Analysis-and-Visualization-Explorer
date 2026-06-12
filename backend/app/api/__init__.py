from fastapi import APIRouter
from app.api.endpoints import repo, ai, metrics

router = APIRouter()
router.include_router(repo.router, prefix="/repo", tags=["Repository"])
router.include_router(ai.router, prefix="/ai", tags=["AI Analysis"])
router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
