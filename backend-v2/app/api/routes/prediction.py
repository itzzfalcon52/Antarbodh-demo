from fastapi import (
    APIRouter,
    HTTPException,
    Query,
)

import numpy as np

from ...config import settings
from ...services.prediction_service import prediction_service


router = APIRouter()


def _validate_location(
    lat: float,
    lon: float,
) -> None:

    if not (
        settings.lat_min
        <= lat
        <= settings.lat_max
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Latitude {lat} is outside "
                f"the ANTARBODH prototype domain "
                f"({settings.lat_min} to "
                f"{settings.lat_max})."
            ),
        )

    if not (
        settings.lon_min
        <= lon
        <= settings.lon_max
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Longitude {lon} is outside "
                f"the ANTARBODH prototype domain "
                f"({settings.lon_min} to "
                f"{settings.lon_max})."
            ),
        )


@router.get("/reconstruct")
def reconstruct(
    date: str = Query(
        ...,
        description="Requested date, YYYY-MM-DD",
    ),
    lat: float = Query(
        ...,
        description="Latitude",
    ),
    lon: float = Query(
        ...,
        description="Longitude",
    ),
):
    """
    Run ANTARBODH on-demand reconstruction for a
    requested date and location.

    Runtime pipeline:

        preprocessed test.nc
            ↓
        frozen ANTARBODH CNN
            ↓
        subsurface temperature profile

    The endpoint contract is unchanged.
    """

    _validate_location(lat, lon)

    try:
        dataset = prediction_service.get_prediction(
            date
        )

        # -------------------------------------------------
        # Extract model grid
        # -------------------------------------------------

        latitude = np.asarray(
            dataset["latitude"]
        )

        longitude = np.asarray(
            dataset["longitude"]
        )

        depth = np.asarray(
            dataset["depth"]
        )

        temperature = np.asarray(
            dataset["temperature"]
        )

        # -------------------------------------------------
        # Find nearest model grid point
        # -------------------------------------------------

        lat_index = int(
            np.abs(
                latitude - lat
            ).argmin()
        )

        lon_index = int(
            np.abs(
                longitude - lon
            ).argmin()
        )

        actual_lat = float(
            latitude[lat_index]
        )

        actual_lon = float(
            longitude[lon_index]
        )

        profile = temperature[
            :,
            lat_index,
            lon_index,
        ]

        # -------------------------------------------------
        # Response
        # -------------------------------------------------

        return {
            "mode": "on_demand_prediction",
            "date": date,
            "requested_latitude": lat,
            "requested_longitude": lon,
            "latitude": actual_lat,
            "longitude": actual_lon,
            "depths_m": depth.tolist(),
            "temperature_degC": (
                profile.tolist()
            ),
            "model_id": settings.model_id,
            "cached": True,
            "provenance": (
                "Preprocessed test.nc X → "
                "ANTARBODH CNN v1 → "
                "subsurface reconstruction"
            ),
        }

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error":
                    "ANTARBODH reconstruction failed.",
                "reason":
                    str(exc),
            },
        )