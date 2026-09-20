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


def validate_depth(
    depth: float,
) -> float:
    """
    Validate that the requested depth is one of
    ANTARBODH's target depths.
    """

    target_depths = np.asarray(
        settings.target_depths,
        dtype=float,
    )

    matches = np.isclose(
        target_depths,
        depth,
        rtol=0.0,
        atol=1e-6,
    )

    if not np.any(matches):

        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid depth",
                "requested_depth": depth,
                "allowed_depths":
                    settings.target_depths,
            },
        )

    return float(
        target_depths[
            np.argmax(matches)
        ]
    )


@router.get("/temperature")
def get_temperature(
    date: str,
    depth: float,
    mode: str = "auto",
):
    """
    Return a horizontal temperature field at one
    ANTARBODH target depth.

    Modes:

      historical
          Read the cached 2025 ANTARBODH reconstruction.

      predict
          Run the frozen ANTARBODH CNN using the
          preprocessed model input from test.nc.

      auto
          Use the historical reconstruction when
          available; otherwise run on-demand prediction.
    """

    # ---------------------------------------------------------
    # Validate mode
    # ---------------------------------------------------------

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
    # Validate depth
    # ---------------------------------------------------------

    depth = validate_depth(depth)

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
            historical_service
            .get_temperature_field(
                date,
                depth,
            )
        )

        if result is None:

            raise HTTPException(
                status_code=500,
                detail={
                    "error":
                        "Historical temperature "
                        "field could not be loaded",
                    "date": date,
                    "depth": depth,
                },
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
            historical_service
            .get_temperature_field(
                date,
                depth,
            )
        )

        if result is None:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Historical temperature "
                    "field could not be loaded."
                ),
            )

        return result

    # ---------------------------------------------------------
    # On-demand prediction
    #
    # Import lazily so the CNN is not loaded when only
    # historical/health endpoints are being used.
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

    if "depth" not in dataset.coords:

        raise HTTPException(
            status_code=500,
            detail=(
                "Prediction dataset has no "
                "depth coordinate."
            ),
        )

    # ---------------------------------------------------------
    # Select requested depth
    # ---------------------------------------------------------

    day_data = dataset.sel(
        depth=depth
    )

    temp_array = (
        day_data.temperature
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
    # Keep this schema unchanged for the frontend.
    # ---------------------------------------------------------

    return {
        "mode": "on_demand_prediction",
        "date": date,
        "depth_m": depth,
        "units": "degC",
        "latitude":
            day_data.latitude.values.tolist(),
        "longitude":
            day_data.longitude.values.tolist(),
        "temperature": temp,
        "model_id":
            dataset.attrs.get(
                "model_id",
                settings.model_id,
            ),
        "cached": was_cached,
        "provenance":
            dataset.attrs.get(
                "provenance",
                "on_demand_prediction",
            ),
    }