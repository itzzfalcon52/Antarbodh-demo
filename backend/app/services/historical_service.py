import numpy as np
import xarray as xr
from pathlib import Path
from typing import Any

from ..config import settings


class HistoricalService:
    """Lazily loads cached 2025 ANTARBODH predictions."""

    def __init__(self):
        self._dataset: xr.Dataset | None = None

    def _load(self) -> xr.Dataset:
        if self._dataset is not None:
            return self._dataset

        path = settings.historical_prediction_path

        if not path.exists():
            raise FileNotFoundError(
                f"Historical prediction file not found: {path}"
            )

        self._dataset = xr.open_dataset(path)

        required = {
            "time",
            "depth",
            "latitude",
            "longitude",
        }

        missing = required - set(
            self._dataset.coords
        )

        if missing:
            raise ValueError(
                "Historical prediction dataset is missing "
                f"coordinates: {sorted(missing)}"
            )

        if "temperature" not in self._dataset.data_vars:
            raise ValueError(
                "Historical prediction dataset does not "
                "contain 'temperature'."
            )

        return self._dataset

    def has_date(self, date_str: str) -> bool:
        dataset = self._load()

        target = np.datetime64(date_str)

        return bool(
            np.any(dataset.time.values == target)
        )

    def get_temperature_field(
        self,
        date_str: str,
        depth: float,
    ) -> dict[str, Any]:

        dataset = self._load()

        if not self.has_date(date_str):
            raise KeyError(
                f"Historical date not available: {date_str}"
            )

        day_data = dataset.sel(
            time=date_str,
            depth=depth,
            method="nearest",
        )

        temp_array = (
            day_data.temperature.values
            .astype(float)
        )

        temp = np.where(
            np.isfinite(temp_array),
            temp_array,
            None,
        ).tolist()

        return {
            "mode": "historical",
            "date": date_str,
            "depth_m": float(depth),
            "units": "degC",
            "latitude":
                day_data.latitude.values.tolist(),
            "longitude":
                day_data.longitude.values.tolist(),
            "temperature": temp,
            "model_id": settings.model_id,
            "cached": True,
            "provenance":
                "cached_antarbodh_prediction",
        }

    def get_profile(
        self,
        date_str: str,
        lat: float,
        lon: float,
    ) -> dict[str, Any]:

        dataset = self._load()

        if not self.has_date(date_str):
            raise KeyError(
                f"Historical date not available: {date_str}"
            )

        profile_data = dataset.interp(
            time=np.datetime64(date_str),
            latitude=lat,
            longitude=lon,
        )

        temp_array = (
            profile_data.temperature.values
            .astype(float)
        )

        temp = np.where(
            np.isfinite(temp_array),
            temp_array,
            None,
        ).tolist()

        return {
            "mode": "historical",
            "date": date_str,
            "latitude": lat,
            "longitude": lon,
            "depths_m":
                profile_data.depth.values.tolist(),
            "temperature_degC": temp,
            "model_id": settings.model_id,
            "cached": True,
            "provenance":
                "cached_antarbodh_prediction",
        }


historical_service = HistoricalService()