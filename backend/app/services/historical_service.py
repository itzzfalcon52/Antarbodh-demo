import xarray as xr
from typing import Optional, Dict, Any
import numpy as np
import pandas as pd
from ..config import settings

class HistoricalService:
    """Service to lazily load and serve cached 2025 historical predictions."""
    def __init__(self):
        self._dataset: Optional[xr.Dataset] = None

    def _load(self):
        if self._dataset is None:
            if settings.historical_prediction_path.exists():
                self._dataset = xr.open_dataset(settings.historical_prediction_path)
            else:
                raise FileNotFoundError(f"Historical prediction not found at {settings.historical_prediction_path}")

    def has_date(self, date_str: str) -> bool:
        if not settings.historical_prediction_path.exists():
            return False
        try:
            self._load()
            return np.datetime64(date_str) in self._dataset.time.values
        except Exception:
            return False

    def get_temperature_field(self, date_str: str, depth: float) -> Optional[Dict[str, Any]]:
        self._load()
        if not self.has_date(date_str):
            return None
        
        try:
            day_data = self._dataset.sel(time=date_str, depth=depth, method="nearest")
            
            lats = day_data.latitude.values.tolist()
            lons = day_data.longitude.values.tolist()
            
            # Convert NaN to None for JSON serialization
            temp_array = day_data.temperature.values.astype(float)
            temp = np.where(np.isnan(temp_array), None, temp_array).tolist()
            
            return {
                "mode": "historical",
                "date": date_str,
                "depth_m": depth,
                "units": "degC",
                "latitude": lats,
                "longitude": lons,
                "temperature": temp,
                "model_id": settings.model_id,
                "cached": True,
                "provenance": "cached_antarbodh_prediction"
            }
        except Exception as e:
            print(f"Error fetching historical field: {e}")
            return None

    def get_profile(self, date_str: str, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        self._load()
        if not self.has_date(date_str):
            return None
        
        try:
            profile_data = self._dataset.sel(time=date_str, latitude=lat, longitude=lon, method="nearest")
            
            depths = profile_data.depth.values.tolist()
            
            temp_array = profile_data.temperature.values.astype(float)
            temp = np.where(np.isnan(temp_array), None, temp_array).tolist()
            
            return {
                "mode": "historical",
                "date": date_str,
                "latitude": lat,
                "longitude": lon,
                "depths_m": depths,
                "temperature_degC": temp,
                "cached": True,
                "provenance": "cached_antarbodh_prediction"
            }
        except Exception as e:
            print(f"Error fetching historical profile: {e}")
            return None

historical_service = HistoricalService()
