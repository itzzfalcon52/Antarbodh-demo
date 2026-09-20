"""
ANTARBODH on-demand inference service.

Runtime flow:

Preprocessed test.nc
        ↓
Select requested date
        ↓
X: (14, 60, 80)
        ↓
Frozen ANTARBODH CNN v1
        ↓
Temperature: (15, 60, 80)
        ↓
xarray Dataset
        ↓
Persistent cache

IMPORTANT
---------
test.nc already contains the final model-ready input.

The runtime inference path does NOT execute:
- raw surface-data loading
- regridding
- preprocessing
- normalization
- GLORYS
- ARGO

GLORYS and ARGO are not used during prediction.
"""


from __future__ import annotations

import numpy as np
import torch
import xarray as xr

from .test_data_service import test_data_service
from .model_service import model_service
from .cache_service import cache_service
from ..config import settings


class PredictionService:

    def __init__(self) -> None:
        pass

    # ------------------------------------------------------------------
    # Full-date prediction
    # ------------------------------------------------------------------

    def get_prediction(
        self,
        date_str: str,
    ) -> xr.Dataset:
        """
        Generate or load the complete prediction field for one date.

        Returns
        -------
        xarray.Dataset
            Dimensions:
                depth × latitude × longitude

            Variable:
                temperature
        """

        # ==============================================================
        # 1. Check persistent cache first
        # ==============================================================

        if cache_service.has_cached_prediction(
            date_str
        ):
            print(
                f"[PREDICTION] Using cached prediction "
                f"for {date_str}"
            )

            return cache_service.load_cached_prediction(
                date_str
            )

        print(
            f"[PREDICTION] Generating prediction "
            f"for {date_str}"
        )

        # ==============================================================
        # 2. Load preprocessed model input
        # ==============================================================

        model_input = test_data_service.get_input(
            date_str
        )

        print(
            "[PREDICTION] Loaded preprocessed "
            f"model input: {model_input.shape}"
        )

        # ==============================================================
        # 3. Validate model input
        # ==============================================================

        expected_input_shape = (
            settings.input_channels,
            60,
            80,
        )

        if model_input.shape != expected_input_shape:
            raise RuntimeError(
                "Invalid model input shape: "
                f"expected {expected_input_shape}, "
                f"received {model_input.shape}"
            )

        if not np.all(
            np.isfinite(model_input)
        ):
            raise RuntimeError(
                "Model input contains non-finite values."
            )

        # ==============================================================
        # 4. Convert to PyTorch tensor
        #
        # (14, 60, 80)
        #       ↓
        # (1, 14, 60, 80)
        # ==============================================================

        input_tensor = (
            torch.from_numpy(model_input)
            .unsqueeze(0)
            .float()
        )

        # ==============================================================
        # 5. Frozen CNN inference
        # ==============================================================

        prediction = model_service.predict(
            input_tensor
        )

        prediction = np.asarray(
            prediction,
            dtype=np.float32,
        )

        print(
            "[PREDICTION] Raw CNN output shape: "
            f"{prediction.shape}"
        )

        # ==============================================================
        # 6. Get coordinates
        # ==============================================================

        coordinates = (
            test_data_service.get_coordinates()
        )

        latitude = coordinates["latitude"]
        longitude = coordinates["longitude"]
        depth = coordinates["depth"]

        # ==============================================================
        # 7. Validate CNN output
        # ==============================================================

        expected_output_shape = (
            len(depth),
            len(latitude),
            len(longitude),
        )

        if prediction.shape != expected_output_shape:
            raise RuntimeError(
                "Unexpected CNN output shape.\n"
                f"Expected: {expected_output_shape}\n"
                f"Received: {prediction.shape}"
            )

        if not np.all(
            np.isfinite(prediction)
        ):
            raise RuntimeError(
                "CNN prediction contains "
                "non-finite values."
            )

        # ==============================================================
        # 8. Build xarray Dataset
        # ==============================================================

        dataset = xr.Dataset(
            {
                "temperature": (
                    [
                        "depth",
                        "latitude",
                        "longitude",
                    ],
                    prediction,
                )
            },
            coords={
                "depth": depth,
                "latitude": latitude,
                "longitude": longitude,
            },
            attrs={
                "model_id": settings.model_id,
                "prediction_date": date_str,
                "input_channels": settings.input_channels,
                "units": "degC",
                "provenance": (
                    "Preprocessed inference_inputs.nc X → "
                    "ANTARBODH CNN v1 → "
                    "subsurface reconstruction"
                ),
                "preprocessing_version": (
                    "preprocessed_test_dataset"
                ),
                "domain": "5N-20N_80E-100E",
                "grid_resolution": settings.resolution,
                "target_depth_count": len(depth),
            },
        )

        # ==============================================================
        # 9. Save persistent date-level cache
        # ==============================================================

        cache_service.save_prediction(
            date_str=date_str,
            temperature_field=prediction,
            lats=latitude,
            lons=longitude,
            depths=depth,
        )

        print(
            f"[PREDICTION] Prediction saved to cache "
            f"for {date_str}"
        )

        return dataset

    # ------------------------------------------------------------------
    # Point/profile helper
    # ------------------------------------------------------------------

    def predict_point(
        self,
        date_str: str,
        latitude: float,
        longitude: float,
    ) -> np.ndarray:
        """
        Extract the nearest-grid-point temperature profile.
        """

        dataset = self.get_prediction(
            date_str
        )

        latitude_values = np.asarray(
            dataset["latitude"]
        )

        longitude_values = np.asarray(
            dataset["longitude"]
        )

        lat_index = int(
            np.abs(
                latitude_values - latitude
            ).argmin()
        )

        lon_index = int(
            np.abs(
                longitude_values - longitude
            ).argmin()
        )

        return np.asarray(
            dataset["temperature"][
                :,
                lat_index,
                lon_index,
            ],
            dtype=np.float32,
        )

    # ------------------------------------------------------------------
    # Cache clearing
    # ------------------------------------------------------------------

    def clear_cache(
        self,
        date_str: str | None = None,
    ) -> None:

        if date_str is None:
            return

        cache_path = (
            cache_service.get_cache_path(
                date_str
            )
        )

        if cache_path.exists():
            cache_path.unlink()


prediction_service = PredictionService()