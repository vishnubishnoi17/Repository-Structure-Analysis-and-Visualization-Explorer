from fastapi import APIRouter, HTTPException, Query
from app.services.metrics_service import MetricsService

router = APIRouter()
metrics_service = MetricsService()


@router.get("/file")
async def get_file_metrics(path: str = Query(...)):
    """
    Calculate and return code metrics for a single file:
    - Lines of Code (LoC), blank lines, comment lines
    - Cyclomatic complexity (for Python/JS)
    - Function/class count
    """
    try:
        return metrics_service.analyze_file(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
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
