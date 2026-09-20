from fastapi import (
    APIRouter,
    HTTPException,
)

import numpy as np

from ...config import settings
from ...services.historical_service import (
    historical_service,
)
from ...services.cache_service import (
    cache_service,
)


router = APIRouter()


def validate_location(
    lat: float,
    lon: float,
) -> None:

    if not (
        settings.lat_min
        <= lat
        <= settings.lat_max
        and
        settings.lon_min
        <= lon
        <= settings.lon_max
    ):

        raise HTTPException(
            status_code=400,
            detail={
                "error":
                    "Coordinates out of bounds",
                "domain": {
                    "lat_min":
                        settings.lat_min,
                    "lat_max":
                        settings.lat_max,
                    "lon_min":
                        settings.lon_min,
                    "lon_max":
                        settings.lon_max,
                },
            },
        )


@router.get("/profile")
def get_profile(
    date: str,
    lat: float,
    lon: float,
    mode: str = "auto",
):
    """
    Return an ANTARBODH temperature profile at
    a requested location.

    Historical:

        Reads the cached 2025 ANTARBODH field.

    Predict:

        Runs the frozen ANTARBODH CNN using the
        preprocessed model input from test.nc.

    ARGO is not used by this endpoint.
    """

    # ---------------------------------------------------------
    # Validate request
    # ---------------------------------------------------------

    validate_location(
        lat,
        lon,
    )

    if mode not in {
        "historical",
        "predict",
        "auto",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid mode. "
                "Use auto, historical, or predict."
            ),
        )

    # ---------------------------------------------------------
    # Historical mode
    # ---------------------------------------------------------

    if mode == "historical":

        if not historical_service.has_date(
            date
        ):

            raise HTTPException(
                status_code=404,
                detail={
                    "error":
                        "Historical prediction "
                        "not available",
                    "date": date,
                },
            )

        result = (
            historical_service.get_profile(
                date,
                lat,
                lon,
            )
        )

        if result is None:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Historical profile "
                    "could not be loaded."
                ),
            )

        return result

    # ---------------------------------------------------------
    # Auto mode
    #
    # Historical data takes precedence when available.
    # ---------------------------------------------------------

    if (
        mode == "auto"
        and historical_service.has_date(date)
    ):

        result = (
            historical_service.get_profile(
                date,
                lat,
                lon,
            )
        )

        if result is None:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Historical profile "
                    "could not be loaded."
                ),
            )

        return result

    # ---------------------------------------------------------
    # On-demand prediction
    #
    # Lazy import prevents the CNN from loading merely
    # because the API module is imported.
    # ---------------------------------------------------------

    from ...services.prediction_service import (
        prediction_service,
    )

    was_cached = (
        cache_service.has_cached_prediction(
            date
        )
    )

    dataset = (
        prediction_service.get_prediction(
            date
        )
    )

    # ---------------------------------------------------------
    # Interpolate to requested coordinates
    #
    # This preserves the behavior of the existing endpoint:
    # return the profile at the requested coordinate rather
    # than simply claiming the nearest grid cell is exact.
    # ---------------------------------------------------------

    try:

        profile_data = dataset.interp(
            latitude=lat,
            longitude=lon,
        )

    except Exception:

        profile_data = dataset.sel(
            latitude=lat,
            longitude=lon,
            method="nearest",
        )

    depths = (
        profile_data.depth
        .values
        .tolist()
    )

    temp_array = (
        profile_data.temperature
        .values
        .astype(float)
    )

    temp = np.where(
        np.isfinite(temp_array),
        temp_array,
        None,
    ).tolist()

    # ---------------------------------------------------------
    # Response
    #
    # IMPORTANT:
    # Keep the frontend contract unchanged.
    # ---------------------------------------------------------

    return {
        "mode": "on_demand_prediction",
        "date": date,
        "latitude": lat,
        "longitude": lon,
        "depths_m": depths,
        "temperature_degC": temp,
        "cached": was_cached,
        "model_id":
            dataset.attrs.get(
                "model_id",
                settings.model_id,
            ),
        "provenance":
            dataset.attrs.get(
                "provenance",
                "on_demand_prediction",
            ),
    }