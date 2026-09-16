from pathlib import Path

import numpy as np
import xarray as xr
from fastapi import APIRouter, HTTPException, Query

from ...config import settings


router = APIRouter()


HISTORICAL_PATH = (
    settings.historical_prediction_path
)


@router.get("/temperature-series")
def get_historical_temperature_series(
    depth: float = Query(..., description="Target depth in metres"),
):
    """
    Return the complete 2025 temperature time series
    for one target depth.

    The historical prediction file contains:
        time × depth × latitude × longitude

    We return one depth across all 365 days so the
    frontend can scrub/play the timeline locally without
    making one API request per day.
    """

    if not HISTORICAL_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Historical prediction file not found: "
                f"{HISTORICAL_PATH}"
            ),
        )

    try:
        with xr.open_dataset(
            HISTORICAL_PATH,
            cache=False,
        ) as ds:

            required_variables = {
                "temperature",
            }

            missing_variables = (
                required_variables - set(ds.data_vars)
            )

            if missing_variables:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Historical dataset is missing "
                        f"required variables: "
                        f"{sorted(missing_variables)}"
                    ),
                )

            required_coords = {
                "time",
                "depth",
                "latitude",
                "longitude",
            }

            missing_coords = (
                required_coords - set(ds.coords)
            )

            if missing_coords:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Historical dataset is missing "
                        f"required coordinates: "
                        f"{sorted(missing_coords)}"
                    ),
                )

            depths = ds["depth"].values.astype(float)

            # Use the nearest trained target depth.
            depth_index = int(
                np.abs(depths - depth).argmin()
            )

            actual_depth = float(
                depths[depth_index]
            )

            temperature = (
                ds["temperature"]
                .isel(depth=depth_index)
                .values
            )

            times = ds["time"].values

            latitude = (
                ds["latitude"]
                .values
                .astype(float)
                .tolist()
            )

            longitude = (
                ds["longitude"]
                .values
                .astype(float)
                .tolist()
            )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to read historical "
                f"prediction data: {exc}"
            ),
        ) from exc

    # Expected shape:
    # time × latitude × longitude
    if temperature.ndim != 3:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unexpected temperature shape. "
                f"Expected 3 dimensions, got "
                f"{temperature.shape}"
            ),
        )

    # Encode temperatures at 0.01 °C precision.
    #
    # This substantially reduces the JSON payload while
    # retaining more precision than the UI displays.
    valid_temperature = np.isfinite(
        temperature
    )

    encoded = np.zeros(
        temperature.shape,
        dtype=np.int16,
    )

    encoded[valid_temperature] = np.round(
        temperature[valid_temperature] * 100.0
    ).astype(np.int16)

    valid_mask = valid_temperature.astype(
        np.uint8
    )

    dates = [
        np.datetime_as_string(
            value,
            unit="D",
        )
        for value in times
    ]

    return {
        "mode": "historical",
        "model_id": settings.model_id,
        "year": 2025,

        "requested_depth_m": depth,
        "depth_m": actual_depth,

        "units": "degC",

        "dates": dates,

        "latitude": latitude,
        "longitude": longitude,

        "shape": [
            int(encoded.shape[0]),
            int(encoded.shape[1]),
            int(encoded.shape[2]),
        ],

        "scale_factor": 0.01,
        "add_offset": 0.0,

        "temperature_encoded": encoded.tolist(),
        "valid_mask": valid_mask.tolist(),

        "source": (
            "ANTARBODH 2025 historical "
            "prediction dataset"
        ),

        "provenance": {
            "dataset": str(
                HISTORICAL_PATH.name
            ),
            "temporal_resolution": "daily",
            "spatial_resolution": "0.25 degree",
            "domain": "Bay of Bengal (5-20N, 80-100E)",
        },
    }