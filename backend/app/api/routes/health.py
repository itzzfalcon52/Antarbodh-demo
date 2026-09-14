"""Health check route."""

from fastapi import APIRouter
from backend.app.services.model_service import model_service
from backend.app.services.prediction_service import prediction_service

router = APIRouter(tags=["health"])

@router.get("/health")
def get_health():
    model_loaded = bool(model_service.get_model_info())
    data_available = prediction_service.dataset is not None
    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "prediction_data_available": data_available
    }
