from fastapi import APIRouter

from ...config import settings
from ...services.model_service import model_service


router = APIRouter()


@router.get("/health")
def health():
    """
    Backend health/status endpoint.

    API availability and model loading are intentionally
    reported as separate states.

    The CNN is loaded lazily on the first prediction request,
    so model_loaded=False does NOT mean the API is offline.
    """

    checkpoint_exists = settings.checkpoint_path.exists()
    model_loaded = model_service.is_loaded()

    return {
        "status": "ok",
        "api_online": True,

        "model_id": settings.model_id,
        "model_loaded": model_loaded,
        "model_ready": checkpoint_exists,

        "checkpoint_exists": checkpoint_exists,
        "device": str(model_service.device),

        "version": "v1",
    }