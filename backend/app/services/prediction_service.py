"""
ANTARBODH on-demand inference service.

Runtime flow:

Date
 ↓
Surface observations
 ↓
Existing preprocessing components
 ↓
Training normalization statistics
 ↓
14-channel CNN input
 ↓
Frozen ANTARBODH CNN v1
 ↓
15-depth temperature field
 ↓
xarray Dataset
 ↓
Cache

IMPORTANT
---------
The training preprocessing pipeline is NOT modified.

This service reuses the preprocessing implementation at runtime,
but does not execute the training dataset-building pipeline.

GLORYS and ARGO are NOT used during prediction.
"""

from __future__ import annotations

import numpy as np
import torch
import xarray as xr

from .surface_data_service import surface_data_service
from .preprocessing_service import preprocessing_service
from .normalization_service import normalization_service
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

            Variables:

                temperature
        """

        # ==============================================================
        # 1. Check persistent cache first
        # ==============================================================

        if cache_service.has_cached_prediction(date_str):

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
        # 2. Load actual surface observations
        # ==============================================================

        raw_datasets = (
            surface_data_service.fetch_all(
                date_str
            )
        )

        if raw_datasets is None:
            raise RuntimeError(
                f"Surface data service returned no data "
                f"for {date_str}."
            )

        # ==============================================================
        # 3. Reuse existing preprocessing implementation
        #
        # Output:
        #
        # physical_array -> (7, 60, 80)
        # missing_masks  -> (7, 60, 80)
        # ==============================================================
        
        (
            physical_array,
            missing_masks,
        ) = preprocessing_service.preprocess(
            date_str=date_str,
            raw_datasets=raw_datasets,
        )

        print(
            "[PREDICTION] Preprocessing complete: "
            f"physical={physical_array.shape}, "
            f"masks={missing_masks.shape}"
        )

        # ==============================================================
        # 4. Apply training normalization
        #
        # Result:
        #
        # (14, 60, 80)
        # ==============================================================

        model_input = (
            normalization_service.transform(
                physical_array=physical_array,
                missing_masks=missing_masks,
            )
        )

        print(
            "[PREDICTION] Model input shape: "
            f"{model_input.shape}"
        )

        if model_input.shape != (
            settings.input_channels,
            len(preprocessing_service.common_lat),
            len(preprocessing_service.common_lon),
        ):
            raise RuntimeError(
                "Invalid model input shape: "
                f"{model_input.shape}"
            )

        # ==============================================================
        # 5. Convert to PyTorch tensor
        #
        # [14, 60, 80]
        #      ↓
        # [1, 14, 60, 80]
        # ==============================================================

        input_tensor = torch.from_numpy(
            model_input
        ).unsqueeze(0).float()

        # ==============================================================
        # 6. Frozen CNN inference
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
        # 7. Validate output
        # ==============================================================

        expected_shape = (
            len(settings.target_depths),
            len(preprocessing_service.common_lat),
            len(preprocessing_service.common_lon),
        )

        if prediction.shape != expected_shape:

            raise RuntimeError(
                "Unexpected CNN output shape.\n"
                f"Expected: {expected_shape}\n"
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
        # 8. Convert prediction into xarray Dataset
        #
        # This preserves the interface expected by your existing
        # prediction route.
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
                "depth": np.asarray(
                    settings.target_depths,
                    dtype=np.float32,
                ),

                "latitude": np.asarray(
                    preprocessing_service.common_lat,
                    dtype=np.float32,
                ),

                "longitude": np.asarray(
                    preprocessing_service.common_lon,
                    dtype=np.float32,
                ),
            },
            attrs={
                "model_id": settings.model_id,

                "prediction_date": date_str,

                "input_channels": settings.input_channels,

                "units": "degC",

                "provenance": (
                    "Surface observations → "
                    "ANTARBODH CNN v1 → "
                    "subsurface reconstruction"
                ),

                "preprocessing_version": (
                    "preprocessing_v1"
                ),

                "domain": (
                    "5N-20N_80E-100E"
                ),

                "grid_resolution": (
                    settings.resolution
                ),

                "target_depth_count": (
                    len(settings.target_depths)
                ),
            },
        )

        # ==============================================================
        # 9. Save persistent date-level cache
        # ==============================================================

        cache_service.save_prediction(
            date_str=date_str,
            temperature_field=prediction,
            lats=np.asarray(
                preprocessing_service.common_lat
            ),
            lons=np.asarray(
                preprocessing_service.common_lon
            ),
            depths=settings.target_depths,
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