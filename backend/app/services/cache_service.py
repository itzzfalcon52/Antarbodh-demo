import xarray as xr
from pathlib import Path
import pandas as pd
import numpy as np
from ..config import settings

class CacheService:
    def __init__(self):
        self.cache_dir = settings.on_demand_prediction_cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_cache_path(self, date_str: str) -> Path:
        return self.cache_dir / f"{date_str}.nc"

    def has_cached_prediction(self, date_str: str) -> bool:
        return self.get_cache_path(date_str).exists()

    def load_cached_prediction(self, date_str: str) -> xr.Dataset:
        return xr.open_dataset(self.get_cache_path(date_str))

    def save_prediction(self, date_str: str, temperature_field: np.ndarray, lats: np.ndarray, lons: np.ndarray, depths: list[float]):
        ds = xr.Dataset(
            {
                "temperature": (["depth", "latitude", "longitude"], temperature_field)
            },
            coords={
                "time": pd.to_datetime([date_str]),
                "depth": depths,
                "latitude": lats,
                "longitude": lons
            },
            attrs={
                "model_id": settings.model_id,
                "prediction_date": date_str,
                "input_channels": settings.input_channels,
                "units": "degC",
                "provenance": "on_demand_prediction",
                "preprocessing_version": "preprocessing_v1",
                "domain": "5N-20N_80E-100E",
                "grid_resolution": settings.resolution,
                "target_depth_count": len(depths),
            }
        )
        ds.to_netcdf(self.get_cache_path(date_str))

cache_service = CacheService()
