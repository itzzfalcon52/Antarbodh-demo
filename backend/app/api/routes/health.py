from fastapi import APIRouter
from ...config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": False, # Will update once model service is loaded
        "model_id": settings.model_id,
        "historical_data_available": False,
        "prediction_service_available": False
    }
