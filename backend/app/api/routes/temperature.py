from fastapi import APIRouter, HTTPException
from typing import Optional
import numpy as np
from ...services.historical_service import historical_service
from ...services.prediction_service import prediction_service
from ...services.cache_service import cache_service

router = APIRouter()

@router.get("/temperature")
async def get_temperature(date: str, depth: float, mode: str = "auto"):
    """
    mode: historical | predict | auto
    """
    if mode == "historical":
        if not historical_service.has_date(date):
            raise HTTPException(status_code=404, detail="Historical prediction not available for date")
        return historical_service.get_temperature_field(date, depth)
        
    elif mode == "predict" or mode == "auto":
        if mode == "auto" and historical_service.has_date(date):
            return historical_service.get_temperature_field(date, depth)
            
        was_cached = cache_service.has_cached_prediction(date)
        dataset = prediction_service.get_prediction(date)
        
        # Check if requested depth is valid
        if depth not in dataset.depth.values:
            raise HTTPException(status_code=400, detail=f"Invalid depth {depth}. Must be one of {dataset.depth.values.tolist()}")
            
        day_data = dataset.sel(depth=depth, method="nearest")
        temp_array = day_data.temperature.values.astype(float)
        temp = np.where(np.isnan(temp_array), None, temp_array).tolist()
        
        return {
            "mode": "on_demand_prediction",
            "date": date,
            "depth_m": depth,
            "units": "degC",
            "latitude": day_data.latitude.values.tolist(),
            "longitude": day_data.longitude.values.tolist(),
            "temperature": temp,
            "model_id": dataset.attrs.get("model_id"),
            "cached": was_cached,
            "provenance": "on_demand_prediction"
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Use auto, historical, or predict.")
