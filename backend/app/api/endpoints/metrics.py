from fastapi import APIRouter, HTTPException, Query
from app.services.metrics_service import MetricsService
from app.services.session_service import session_service

router = APIRouter()
metrics_service = MetricsService()


@router.get("/file")
async def get_file_metrics(
    path: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    rel_path: str | None = Query(default=None),
):
    """
    Calculate and return code metrics for a single file:
    - Lines of Code (LoC), blank lines, comment lines
    - Cyclomatic complexity (for Python/JS)
    - Function/class count
    """
    try:
        if session_id and rel_path:
            path = str(session_service.resolve_file(session_id, rel_path))
        elif not path:
            raise HTTPException(
                status_code=400,
                detail="Provide either path or session_id + rel_path",
            )
        return metrics_service.analyze_file(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def get_batch_metrics(paths: list[str]):
    """
    Analyze metrics for multiple files at once.
    Returns a list of metrics objects keyed by file path.
    """
    results = {}
    for path in paths:
        try:
            results[path] = metrics_service.analyze_file(path)
        except Exception as e:
            results[path] = {"error": str(e)}
    return results
