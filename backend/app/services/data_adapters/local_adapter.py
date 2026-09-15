import xarray as xr
import pandas as pd
import numpy as np
from typing import Optional
from pathlib import Path
from .base_adapter import BaseAdapter
from ...config import settings

class LocalNetCDFAdapter(BaseAdapter):
    """Generic adapter that reads local NetCDF files from a specific folder."""
    def __init__(self, folder_name: str, source_name: str):
        self.folder_name = folder_name
        self.source_name = source_name
        self.data_dir = settings.surface_data_root / folder_name
        self._dataset: Optional[xr.Dataset] = None
        self._available_dates: Optional[list[str]] = None

    def _load_metadata(self):
        if self._dataset is None and self.data_dir.exists():
            files = list(self.data_dir.glob("*.nc"))
            if files:
                try:
                    # Just open dataset lazily
                    self._dataset = xr.open_mfdataset(files, combine='by_coords')
                    times = pd.to_datetime(self._dataset.time.values)
                    self._available_dates = [t.strftime('%Y-%m-%d') for t in times]
                except Exception as e:
                    print(f"Error loading metadata for {self.folder_name}: {e}")
                    self._available_dates = []
            else:
                self._available_dates = []

    def get_available_dates(self) -> list[str]:
        if self._available_dates is None:
            self._load_metadata()
        return self._available_dates or []

    def has_date(self, date_str: str) -> bool:
        dates = self.get_available_dates()
        return date_str in dates

    def load(self, date_str: str) -> Optional[xr.Dataset]:
        if not self.has_date(date_str):
            return None
        try:
            # Slices just that day
            return self._dataset.sel(time=date_str)
        except Exception as e:
            print(f"Error loading {self.folder_name} for date {date_str}: {e}")
            return None

    def get_metadata(self) -> dict:
        return {
            "source": self.source_name,
            "type": "local_netcdf",
            "path": str(self.data_dir)
        }
