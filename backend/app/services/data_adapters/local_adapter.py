import xarray as xr
import pandas as pd
from typing import Optional

from .base_adapter import BaseAdapter
from ...config import settings


class LocalNetCDFAdapter(BaseAdapter):
    """
    Adapter for local NetCDF surface datasets.

    Each variable normally has one canonical NetCDF file inside its
    corresponding folder. The filename can be explicitly configured.

    Example:

        data/raw/sst/sst_bob.nc
        data/raw/ssh/ssh_bob_(2).nc
        data/raw/currents/currents_bob_(2).nc
        data/raw/winds/winds_bob.nc
        data/raw/sss/sss_bob_full.nc

    The NetCDF file may contain many dates. The adapter opens the
    dataset lazily and selects only the requested date during load().
    """

    def __init__(
        self,
        folder_name: str,
        source_name: str,
        filename: Optional[str] = None,
    ):
        self.folder_name = folder_name
        self.source_name = source_name
        self.data_dir = settings.surface_data_root / folder_name
        self.filename = filename

        self._dataset: Optional[xr.Dataset] = None
        self._available_dates: Optional[list[str]] = None

    def _get_file(self):
        """
        Resolve the NetCDF file to use.

        If a filename is explicitly configured, use that file.
        Otherwise, require exactly one .nc file in the directory.
        """

        if not self.data_dir.exists():
            print(
                f"[{self.folder_name}] Directory does not exist: "
                f"{self.data_dir}"
            )
            return None

        # Explicit filename — preferred for deterministic inference.
        if self.filename:
            file_path = self.data_dir / self.filename

            if not file_path.exists():
                print(
                    f"[{self.folder_name}] Configured file does not exist: "
                    f"{file_path}"
                )
                return None

            return file_path

        # Automatic mode for folders containing exactly one file.
        files = sorted(self.data_dir.glob("*.nc"))

        if not files:
            print(
                f"[{self.folder_name}] No NetCDF files found in "
                f"{self.data_dir}"
            )
            return None

        if len(files) > 1:
            raise RuntimeError(
                f"[{self.folder_name}] Multiple NetCDF files found "
                f"but no filename was configured: "
                f"{[f.name for f in files]}"
            )

        return files[0]

    def _load_metadata(self):
        """
        Open the canonical NetCDF file lazily and build its available-date
        index.

        IMPORTANT:
        We use open_dataset(), not open_mfdataset(), because each adapter
        points to one canonical NetCDF file.
        """

        if self._dataset is not None:
            return

        file_path = self._get_file()

        if file_path is None:
            self._available_dates = []
            return

        try:
            print(
                f"[{self.folder_name}] Opening {file_path.name}"
            )

            self._dataset = xr.open_dataset(
                file_path,
                chunks="auto",
            )

            if "time" not in self._dataset.coords:
                raise ValueError(
                    f"{file_path.name} does not contain a time coordinate"
                )

            times = pd.to_datetime(
                self._dataset["time"].values
            )

            self._available_dates = sorted({
                pd.Timestamp(t).strftime("%Y-%m-%d")
                for t in times
            })

            print(
                f"[{self.folder_name}] "
                f"{file_path.name}: "
                f"{len(self._available_dates)} dates available"
            )

        except Exception as exc:
            print(
                f"[{self.folder_name}] "
                f"Error loading metadata: {exc}"
            )

            self._dataset = None
            self._available_dates = []

    def get_available_dates(self) -> list[str]:
        """
        Return all dates available in the canonical dataset.
        """

        if self._available_dates is None:
            self._load_metadata()

        return self._available_dates or []

    def has_date(self, date_str: str) -> bool:
        """
        Check whether the requested date exists.
        """

        dates = self.get_available_dates()

        return date_str in dates

    def load(self, date_str: str) -> Optional[xr.Dataset]:
        """
        Load only the requested day's data.

        The source NetCDF remains lazy. We select the requested time
        slice here and let downstream preprocessing load only what it needs.
        """

        if not self.has_date(date_str):
            return None

        if self._dataset is None:
            return None

        try:
            requested = pd.Timestamp(date_str)

            # Select the requested day.
            #
            # The +1 day endpoint handles datasets containing hourly,
            # 6-hourly, or other sub-daily observations.
            day = self._dataset.sel(
                time=slice(
                    requested,
                    requested + pd.Timedelta(days=1),
                )
            )

            if "time" in day.dims:
                if day.sizes.get("time", 0) == 0:
                    return None

            return day

        except Exception as exc:
            print(
                f"[{self.folder_name}] "
                f"Error loading {date_str}: {exc}"
            )
            return None

    def get_metadata(self) -> dict:
        """
        Return adapter metadata.
        """

        file_path = self._get_file()

        return {
            "source": self.source_name,
            "type": "local_netcdf",
            "path": str(self.data_dir),
            "filename": file_path.name if file_path else None,
        }