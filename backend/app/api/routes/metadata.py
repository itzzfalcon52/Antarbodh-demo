"""Metadata and model information routes."""

from fastapi import APIRouter
from backend.app.config import settings
from backend.app.services.model_service import model_service
from backend.app.services.prediction_service import prediction_service
from backend.app.schemas.temperature import ModelInfoResponse, MetadataResponse

router = APIRouter(tags=["metadata"])

@router.get("/model", response_model=ModelInfoResponse)
def get_model():
    return model_service.get_model_info()

@router.get("/metadata", response_model=MetadataResponse)
def get_metadata():
    model_info = model_service.get_model_info()
    available_dates = prediction_service.get_available_dates()
    available_depths = prediction_service.get_available_depths()
    
    return {
        "project_name": "ANTARBODH — AI-Powered Subsurface Ocean Intelligence",
        "supported_dates": available_dates,
        "supported_depths": available_depths,
        "domain": {
            "lat_min": settings.LAT_MIN,
            "lat_max": settings.LAT_MAX,
            "lon_min": settings.LON_MIN,
            "lon_max": settings.LON_MAX
        },
        "resolution_deg": settings.RESOLUTION_DEG,
        "variable_names": [
            "temperature", "sst", "sss", "ssh", "current_u", "current_v", "wind_u", "wind_v"
        ],
        "units": {
            "temperature": "°C",
            "sst": "°C",
            "sss": "PSU",
            "ssh": "m",
            "currents": "m/s",
            "winds": "m/s",
            "depth": "m"
        },
        "sss_availability": {
            "period": "2025",
            "available": False,
            "reason": "Level-4 multi-year SSS product terminates Dec 2024; 2025 SSS relies on explicit zero-mask handling"
        },
        "model_info": model_info
    }
