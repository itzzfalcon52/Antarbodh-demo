import xarray as xr
import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple
import sys
from pathlib import Path
from ..config import settings

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.preprocessing.regrid import regrid_surface_variables
from src.preprocessing.config import load_preprocessing_config, build_common_grid, PHYSICAL_CHANNELS

class PreprocessingService:
    def __init__(self):
        self.prep_config = load_preprocessing_config()
        # Override config with our settings if needed
        self.prep_config.min_lat = settings.lat_min
        self.prep_config.max_lat = settings.lat_max
        self.prep_config.min_lon = settings.lon_min
        self.prep_config.max_lon = settings.lon_max
        self.prep_config.grid_resolution = settings.resolution
        self.common_lat, self.common_lon = build_common_grid(self.prep_config)

    def preprocess(self, date_str: str, raw_datasets: Dict[str, Optional[xr.Dataset]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Takes raw surface observations and returns (physical_channels, missing_masks).
        Both are numpy arrays of shape (7, H, W).
        """
        canonical_time = pd.DatetimeIndex([pd.Timestamp(date_str)])

        qc_vars = {}
        for key in ["sst", "sss", "ssh", "currents", "winds"]:
            if raw_datasets.get(key) is not None:
                ds = raw_datasets[key]
                if "time" not in ds.dims:
                    ds = ds.expand_dims({"time": [pd.Timestamp(date_str)]})
                qc_vars[key] = ds
                
        try:
            surface_common = regrid_surface_variables(
                qc_vars, self.common_lat, self.common_lon, canonical_time,
                interp_method="nearest"
            )
        except Exception as e:
            print(f"Error in regridding: {e}")
            raise e
            
        physical_channels = []
        for ch in PHYSICAL_CHANNELS:
            if ch in surface_common.data_vars:
                val = surface_common[ch].isel(time=0).values
                physical_channels.append(val)
            else:
                physical_channels.append(np.full((len(self.common_lat), len(self.common_lon)), np.nan))
                
        physical_array = np.stack(physical_channels, axis=0) # (7, H, W)
        
        # Build masks (1 where valid, 0 where NaN)
        missing_masks = (~np.isnan(physical_array)).astype(np.float32)
        
        return physical_array, missing_masks

preprocessing_service = PreprocessingService()
