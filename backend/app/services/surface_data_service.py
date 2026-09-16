from typing import Dict, Optional

import xarray as xr

from .data_adapters.sst_adapter import sst_adapter
from .data_adapters.sss_adapter import sss_adapter
from .data_adapters.ssh_adapter import ssh_adapter
from .data_adapters.currents_adapter import currents_adapter
from .data_adapters.winds_adapter import winds_adapter


class SurfaceDataService:

    def __init__(self):

        self.adapters = {
            "sst": sst_adapter,
            "sss": sss_adapter,
            "ssh": ssh_adapter,
            "currents": currents_adapter,
            "winds": winds_adapter,
        }

    def fetch_all(
        self,
        date_str: str,
    ) -> Dict[
        str,
        Optional[xr.Dataset]
    ]:

        results: Dict[
            str,
            Optional[xr.Dataset]
        ] = {}

        for key, adapter in (
            self.adapters.items()
        ):

            try:

                ds = adapter.load(
                    date_str
                )

                results[key] = ds

                if ds is None:

                    print(
                        f"[SURFACE] {key}: "
                        f"NO DATA for {date_str}"
                    )

                else:

                    print(
                        f"[SURFACE] {key}: "
                        f"loaded for {date_str}"
                    )

            except Exception as exc:

                print(
                    f"[SURFACE] {key}: "
                    f"FAILED for {date_str}: "
                    f"{exc}"
                )

                results[key] = None

        return results


surface_data_service = (
    SurfaceDataService()
)