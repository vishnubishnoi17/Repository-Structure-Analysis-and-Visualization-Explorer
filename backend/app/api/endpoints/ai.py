from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.cache_service import CacheService

router = APIRouter()
cache_service = CacheService()


def _get_ai_service():
    """Lazy-load AIService so missing API key doesn't crash startup."""
    try:
        from app.services.ai_service import AIService
        return AIService()
    except EnvironmentError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e) + " — Set GEMINI_API_KEY in backend/.env",
        )


class AnalyzeRequest(BaseModel):
    file_path: str
    file_content: str
    language: Optional[str] = None
    force_refresh: Optional[bool] = False


class ChatRequest(BaseModel):
    file_path: str
    file_content: str
    question: str


@router.post("/analyze")
async def analyze_file(request: AnalyzeRequest):
    """Send file content to Gemini AI and return a plain-English explanation."""
    if not request.force_refresh:
        cached = cache_service.get(request.file_content)
        if cached:
            return {"summary": cached, "cached": True, "file_path": request.file_path}

    ai_service = _get_ai_service()
    try:
        summary = await ai_service.summarize_file(
            content=request.file_content,
            file_path=request.file_path,
            language=request.language,
        )
        cache_service.set(request.file_content, summary)
        return {"summary": summary, "cached": False, "file_path": request.file_path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/chat")
async def chat_about_file(request: ChatRequest):
    """Answer a specific question about a file."""
    ai_service = _get_ai_service()
    try:
        answer = await ai_service.answer_question(
            content=request.file_content,
            file_path=request.file_path,
            question=request.question,
        )
        return {"answer": answer, "file_path": request.file_path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.get("/cache/stats")
async def cache_stats():
    return cache_service.stats()


@router.delete("/cache")
async def clear_cache():
    cache_service.clear()
    return {"status": "cache cleared"}
