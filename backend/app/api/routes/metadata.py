from fastapi import APIRouter
from ...config import settings

router = APIRouter()

@router.get("/metadata")
def get_metadata():
    return {
        "model_id": settings.model_id,
        "input_channels": settings.input_channels,
        "target_depths": settings.target_depths,
        "domain": {
            "lat_min": settings.lat_min,
            "lat_max": settings.lat_max,
            "lon_min": settings.lon_min,
            "lon_max": settings.lon_max,
            "resolution": settings.resolution
        },
        "policy": {
            "allow_partial_inputs": settings.inference_policy.allow_partial_inputs,
            "max_missing_physical_channels": settings.inference_policy.max_missing_physical_channels,
            "mandatory_channels": settings.inference_policy.mandatory_channels
        }
    }
