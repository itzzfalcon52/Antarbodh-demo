"""Prediction service for serving precomputed 2025 ANTARBODH 3D temperature reconstructions."""

import numpy as np
import xarray as xr
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.app.config import settings

class PredictionService:
    _instance = None
    _dataset: Optional[xr.Dataset] = None

    @classmethod
    def get_instance(cls) -> "PredictionService":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_dataset()
        return cls._instance

    def _load_dataset(self):
        nc_path = settings.PREDICTIONS_NC_PATH
        if not nc_path.exists():
            raise FileNotFoundError(f"Predictions NetCDF file not found at: {nc_path}")
            
        print(f"Loading prediction dataset from {nc_path}...")
        # Load dataset into memory for ultra-responsive map updates
        self._dataset = xr.open_dataset(nc_path).load()
        print("✓ Prediction dataset loaded successfully into memory.")

    @property
    def dataset(self) -> xr.Dataset:
        if self._dataset is None:
            self._load_dataset()
        return self._dataset

    def get_available_dates(self) -> List[str]:
        return [str(d)[:10] for d in self.dataset.time.values]

    def get_available_depths(self) -> List[float]:
        return [float(d) for d in self.dataset.depth.values]

    def get_temperature_slice(self, date_str: str, depth: float) -> Dict[str, Any]:
        """Extract a 2D temperature field for a given date and depth."""
        ds = self.dataset
        
        # Verify date
        available_dates = self.get_available_dates()
        if date_str not in available_dates:
            raise ValueError(f"Date '{date_str}' is outside supported 2025 range ({available_dates[0]} to {available_dates[-1]}).")
            
        # Verify depth
        available_depths = self.get_available_depths()
        # Find nearest depth or exact match
        matched_depth = None
        for d in available_depths:
            if abs(d - depth) < 1e-3:
                matched_depth = d
                break
        if matched_depth is None:
            raise ValueError(f"Depth {depth} m is not among canonical depths: {available_depths}")

        # Slice data
        sub = ds.sel(time=date_str, depth=matched_depth)
        temp_arr = sub["temperature"].values # (60, 80)
        mask_arr = sub["valid_mask"].values # (60, 80)
        
        # Calculate statistics over ocean pixels
        valid_vals = temp_arr[~np.isnan(temp_arr)]
        if len(valid_vals) > 0:
            min_val = float(np.nanmin(valid_vals))
            max_val = float(np.nanmax(valid_vals))
            mean_val = float(np.nanmean(valid_vals))
        else:
            min_val, max_val, mean_val = None, None, None
            
        # Convert to native python list with None for NaNs (JSON serializable)
        grid_list = []
        for row in temp_arr:
            grid_list.append([float(val) if not np.isnan(val) else None for val in row])
            
        mask_list = mask_arr.astype(int).tolist()
        
        return {
            "date": date_str,
            "depth": float(matched_depth),
            "units": "°C",
            "latitudes": [float(lat) for lat in ds.latitude.values],
            "longitudes": [float(lon) for lon in ds.longitude.values],
            "temperature_grid": grid_list,
            "valid_mask": mask_list,
            "min_temp": min_val,
            "max_temp": max_val,
            "mean_temp": mean_val
        }

prediction_service = PredictionService.get_instance()
