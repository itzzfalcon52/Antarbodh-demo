"""Surface service for providing un-normalized surface parameters with explicit availability."""

import math
import numpy as np
import xarray as xr
from typing import Dict, Any, Optional

from backend.app.config import settings

class SurfaceService:
    _instance = None
    _dataset: Optional[xr.Dataset] = None
    _stats: Dict[str, Dict[str, float]] = {}

    @classmethod
    def get_instance(cls) -> "SurfaceService":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        test_path = settings.TEST_NC_PATH
        stats_path = settings.NORM_STATS_PATH
        
        if not test_path.exists():
            raise FileNotFoundError(f"Test dataset not found at: {test_path}")
        if not stats_path.exists():
            raise FileNotFoundError(f"Normalization stats not found at: {stats_path}")
            
        print(f"Initializing SurfaceService with {test_path.name}...")
        self._dataset = xr.open_dataset(test_path)
        
        with xr.open_dataset(stats_path) as ds_stats:
            for ch in ds_stats.channel.values:
                ch_str = str(ch)
                self._stats[ch_str] = {
                    "mean": float(ds_stats["train_mean"].sel(channel=ch)),
                    "std": float(ds_stats["train_std"].sel(channel=ch))
                }

    @property
    def dataset(self) -> xr.Dataset:
        if self._dataset is None:
            self._initialize()
        return self._dataset

    def get_surface_conditions(self, date_str: str, lat: float, lon: float) -> Dict[str, Any]:
        """Extract un-normalized surface observations and masks at (date, lat, lon)."""
        if not (settings.LAT_MIN <= lat <= settings.LAT_MAX):
            raise ValueError(f"Latitude {lat:.4f}°N is outside Bay of Bengal domain [{settings.LAT_MIN}, {settings.LAT_MAX}]°N.")
        if not (settings.LON_MIN <= lon <= settings.LON_MAX):
            raise ValueError(f"Longitude {lon:.4f}°E is outside Bay of Bengal domain [{settings.LON_MIN}, {settings.LON_MAX}]°E.")

        ds = self.dataset
        dates = [str(d)[:10] for d in ds.time.values]
        if date_str not in dates:
            raise ValueError(f"Date '{date_str}' is outside supported 2025 range ({dates[0]} to {dates[-1]}).")

        # Extract daily 14-channel slice: shape (14, 60, 80)
        daily_x = ds["X"].sel(time=date_str)
        
        # Bilinearly interpolate to (lat, lon)
        try:
            pt_interp = daily_x.interp(latitude=lat, longitude=lon, method="linear").values # (14,)
        except Exception as e:
            raise RuntimeError(f"Surface interpolation failed at ({lat}, {lon}): {str(e)}")

        # Channels:
        # 0: SST, 1: SSS, 2: SSH, 3: Current_U, 4: Current_V, 5: Wind_U, 6: Wind_V
        # 7: SST_mask, 8: SSS_mask, 9: SSH_mask, 10: Current_U_mask, 11: Current_V_mask, 12: Wind_U_mask, 13: Wind_V_mask
        
        def _unnorm(val: float, ch_name: str) -> Optional[float]:
            if np.isnan(val):
                return None
            stat = self._stats.get(ch_name)
            if not stat:
                return float(val)
            return float(val * stat["std"] + stat["mean"])

        # SST
        sst_mask = pt_interp[7]
        sst_raw = _unnorm(pt_interp[0], "SST")
        sst_avail = bool(sst_mask > 0.5 and sst_raw is not None and not np.isnan(sst_raw))
        sst_val = round(sst_raw, 2) if sst_avail and sst_raw is not None else None

        # SSS: missing in 2025 across test period
        sss_mask = pt_interp[8]
        sss_avail = bool(sss_mask > 0.5)
        # SSS in 2025 is strictly missing
        sss_val = None
        sss_avail = False
        sss_reason = "No SSS observation available for this period"

        # SSH
        ssh_mask = pt_interp[9]
        ssh_raw = _unnorm(pt_interp[2], "SSH")
        ssh_avail = bool(ssh_mask > 0.5 and ssh_raw is not None and not np.isnan(ssh_raw))
        ssh_val = round(ssh_raw, 3) if ssh_avail and ssh_raw is not None else None

        # Currents
        cu_mask = pt_interp[10]
        cv_mask = pt_interp[11]
        cu_raw = _unnorm(pt_interp[3], "Current_U")
        cv_raw = _unnorm(pt_interp[4], "Current_V")
        curr_avail = bool(cu_mask > 0.5 and cv_mask > 0.5 and cu_raw is not None and cv_raw is not None)
        cu_val = round(cu_raw, 3) if curr_avail and cu_raw is not None else None
        cv_val = round(cv_raw, 3) if curr_avail and cv_raw is not None else None
        curr_speed = round(math.sqrt(cu_raw**2 + cv_raw**2), 3) if curr_avail and cu_raw is not None and cv_raw is not None else None

        # Winds
        wu_mask = pt_interp[12]
        wv_mask = pt_interp[13]
        wu_raw = _unnorm(pt_interp[5], "Wind_U")
        wv_raw = _unnorm(pt_interp[6], "Wind_V")
        wind_avail = bool(wu_mask > 0.5 and wv_mask > 0.5 and wu_raw is not None and wv_raw is not None)
        wu_val = round(wu_raw, 2) if wind_avail and wu_raw is not None else None
        wv_val = round(wv_raw, 2) if wind_avail and wv_raw is not None else None
        wind_speed = round(math.sqrt(wu_raw**2 + wv_raw**2), 2) if wind_avail and wu_raw is not None and wv_raw is not None else None

        return {
            "date": date_str,
            "latitude": float(lat),
            "longitude": float(lon),
            "sst": {
                "value": sst_val,
                "units": "°C",
                "available": sst_avail,
                "reason": None if sst_avail else "Masked / Land or unobserved"
            },
            "sss": {
                "value": sss_val,
                "units": "PSU",
                "available": sss_avail,
                "reason": sss_reason
            },
            "ssh": {
                "value": ssh_val,
                "units": "m",
                "available": ssh_avail,
                "reason": None if ssh_avail else "Masked / Land or unobserved"
            },
            "current_u": {
                "value": cu_val,
                "units": "m/s",
                "available": curr_avail,
                "reason": None if curr_avail else "Masked / Land or unobserved"
            },
            "current_v": {
                "value": cv_val,
                "units": "m/s",
                "available": curr_avail,
                "reason": None if curr_avail else "Masked / Land or unobserved"
            },
            "current_speed": {
                "value": curr_speed,
                "units": "m/s",
                "available": curr_avail,
                "reason": None if curr_avail else "Masked / Land or unobserved"
            },
            "wind_u": {
                "value": wu_val,
                "units": "m/s",
                "available": wind_avail,
                "reason": None if wind_avail else "Masked / Land or unobserved"
            },
            "wind_v": {
                "value": wv_val,
                "units": "m/s",
                "available": wind_avail,
                "reason": None if wind_avail else "Masked / Land or unobserved"
            },
            "wind_speed": {
                "value": wind_speed,
                "units": "m/s",
                "available": wind_avail,
                "reason": None if wind_avail else "Masked / Land or unobserved"
            }
        }

surface_service = SurfaceService.get_instance()
