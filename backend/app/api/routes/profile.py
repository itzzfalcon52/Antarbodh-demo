from fastapi import APIRouter, HTTPException
import numpy as np
from ...services.historical_service import historical_service
from ...services.prediction_service import prediction_service
from ...services.cache_service import cache_service
from ...config import settings

router = APIRouter()

@router.get("/profile")
async def get_profile(date: str, lat: float, lon: float, mode: str = "auto"):
    """
    mode: historical | predict | auto
    """
    # Validate bounds
    if not (settings.lat_min <= lat <= settings.lat_max and settings.lon_min <= lon <= settings.lon_max):
        raise HTTPException(status_code=400, detail=f"Coordinates out of bounds. Valid domain: lat [{settings.lat_min}, {settings.lat_max}], lon [{settings.lon_min}, {settings.lon_max}]")

    if mode == "historical":
        if not historical_service.has_date(date):
            raise HTTPException(status_code=404, detail="Historical prediction not available for date")
        return historical_service.get_profile(date, lat, lon)
        
    elif mode == "predict" or mode == "auto":
        if mode == "auto" and historical_service.has_date(date):
            return historical_service.get_profile(date, lat, lon)
            
        was_cached = cache_service.has_cached_prediction(date)
        dataset = prediction_service.get_prediction(date)
        
        profile_data = dataset.sel(latitude=lat, longitude=lon, method="nearest")
        depths = profile_data.depth.values.tolist()
        temp_array = profile_data.temperature.values.astype(float)
        temp = np.where(np.isnan(temp_array), None, temp_array).tolist()
        
        return {
            "mode": "on_demand_prediction",
            "date": date,
            "latitude": lat,
            "longitude": lon,
            "depths_m": depths,
            "temperature_degC": temp,
            "cached": was_cached,
            "provenance": "on_demand_prediction"
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Use auto, historical, or predict.")
