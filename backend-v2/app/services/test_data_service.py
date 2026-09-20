from __future__ import annotations

from pathlib import Path

import numpy as np
import xarray as xr

from ..config import settings


class TestDataService:

    def __init__(self) -> None:
        self.path: Path = settings.test_data_path
        self._dataset: xr.Dataset | None = None

    # ---------------------------------------------------------
    # Dataset loading
    # ---------------------------------------------------------

    def _load(self) -> xr.Dataset:

        if self._dataset is not None:
            return self._dataset

        if not self.path.exists():
            raise FileNotFoundError(
                f"Preprocessed test dataset not found: {self.path}"
            )

        print(
            f"[TEST DATA] Opening dataset: {self.path}"
        )

        self._dataset = xr.open_dataset(
            self.path,
            cache=False,
        )

        return self._dataset

    # ---------------------------------------------------------
    # Available dates
    # ---------------------------------------------------------

    def get_available_dates(self) -> list[str]:

        ds = self._load()

        return [
            str(t)[:10]
            for t in ds["time"].values
        ]

    # ---------------------------------------------------------
    # Date availability
    # ---------------------------------------------------------

    def has_date(
        self,
        date_str: str,
    ) -> bool:

        ds = self._load()

        target = np.datetime64(date_str)

        times = ds["time"].values

        return bool(
            np.any(times == target)
        )

    # ---------------------------------------------------------
    # Get model input
    # ---------------------------------------------------------

    def get_input(
        self,
        date_str: str,
    ) -> np.ndarray:

        ds = self._load()

        target = np.datetime64(date_str)

        times = ds["time"].values

        matches = np.where(
            times == target
        )[0]

        if len(matches) == 0:
            raise ValueError(
                f"No preprocessed model input "
                f"available for date {date_str}"
            )

        time_index = int(matches[0])

        model_input = (
            ds["X"]
            .isel(time=time_index)
            .values
        )

        model_input = np.asarray(
            model_input,
            dtype=np.float32,
        )

        expected_shape = (
            settings.input_channels,
            60,
            80,
        )

        if model_input.shape != expected_shape:
            raise RuntimeError(
                "Unexpected model input shape. "
                f"Expected {expected_shape}, "
                f"got {model_input.shape}"
            )

        if not np.all(
            np.isfinite(model_input)
        ):
            raise RuntimeError(
                f"Non-finite values found in "
                f"test input for {date_str}"
            )

        return model_input

    # ---------------------------------------------------------
    # Coordinates
    # ---------------------------------------------------------

    def get_coordinates(self) -> dict[str, np.ndarray]:

        ds = self._load()

        return {
            "latitude": np.asarray(
                ds["latitude"].values,
                dtype=np.float32,
            ),
            "longitude": np.asarray(
                ds["longitude"].values,
                dtype=np.float32,
            ),
            "depth": np.asarray(
                ds["depth"].values,
                dtype=np.float32,
            ),
        }


test_data_service = TestDataService()