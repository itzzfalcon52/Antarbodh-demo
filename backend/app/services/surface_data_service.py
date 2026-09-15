from .data_adapters.sst_adapter import sst_adapter
from .data_adapters.sss_adapter import sss_adapter
from .data_adapters.ssh_adapter import ssh_adapter
from .data_adapters.currents_adapter import currents_adapter
from .data_adapters.winds_adapter import winds_adapter
from typing import Dict, Any, Optional
import xarray as xr

class SurfaceDataService:
    def __init__(self):
        self.adapters = {
            "sst": sst_adapter,
            "sss": sss_adapter,
            "ssh": ssh_adapter,
            "currents": currents_adapter,
            "winds": winds_adapter
        }

    def fetch_all(self, date_str: str) -> Dict[str, Optional[xr.Dataset]]:
        """
        Loads available surface data for all physical variable groups from adapters.
        Returns a dictionary of datasets for the specified date.
        """
        results = {}
        for key, adapter in self.adapters.items():
            try:
                ds = adapter.load(date_str)
                results[key] = ds
            except Exception as e:
                print(f"Error loading {key} for {date_str}: {e}")
                results[key] = None
                
        return results

surface_data_service = SurfaceDataService()
