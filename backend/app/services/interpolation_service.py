"""Interpolation service for extracting vertical profiles at exact coordinates."""

import numpy as np
import xarray as xr
from typing import Dict, Any, List, Optional

from backend.app.config import settings
from backend.app.services.prediction_service import prediction_service

class InterpolationService:
    @staticmethod
    def get_vertical_profile(date_str: str, lat: float, lon: float) -> Dict[str, Any]:
        """Extract a 15-depth vertical temperature profile at exact coordinates."""
        # 1. Validate domain boundaries
        if not (settings.LAT_MIN <= lat <= settings.LAT_MAX):
            raise ValueError(f"Latitude {lat:.4f}°N is outside Bay of Bengal domain [{settings.LAT_MIN}, {settings.LAT_MAX}]°N.")
            
        if not (settings.LON_MIN <= lon <= settings.LON_MAX):
            raise ValueError(f"Longitude {lon:.4f}°E is outside Bay of Bengal domain [{settings.LON_MIN}, {settings.LON_MAX}]°E.")

        ds = prediction_service.dataset
        available_dates = prediction_service.get_available_dates()
        if date_str not in available_dates:
            raise ValueError(f"Date '{date_str}' is outside supported 2025 range ({available_dates[0]} to {available_dates[-1]}).")

        # 2. Extract daily 3D field: shape (15, 60, 80)
        daily_field = ds["temperature"].sel(time=date_str)
        
        # 3. Bilinearly interpolate horizontally to exact (lat, lon)
        try:
            profile_interp = daily_field.interp(latitude=lat, longitude=lon, method="linear")
            temps = profile_interp.values # (15,)
        except Exception as e:
            raise RuntimeError(f"Spatial interpolation failed at ({lat}, {lon}): {str(e)}")

        # 4. Check if location is over land (all NaNs)
        is_all_nan = bool(np.isnan(temps).all())
        is_ocean = not is_all_nan
        
        temp_list: List[Optional[float]] = []
        for t in temps:
            temp_list.append(float(t) if not np.isnan(t) else None)
            
        return {
            "date": date_str,
            "latitude": float(lat),
            "longitude": float(lon),
            "depths": [float(d) for d in ds.depth.values],
            "temperatures": temp_list,
            "units": "°C",
            "is_ocean": is_ocean
        }

interpolation_service = InterpolationService()
