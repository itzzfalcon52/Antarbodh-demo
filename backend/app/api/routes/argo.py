from datetime import date as Date

from fastapi import APIRouter, HTTPException, Query

from ...config import settings
from ...services.argo_service import argo_service


router = APIRouter()


def _validate_location(lat: float, lon: float) -> None:
    if not settings.lat_min <= lat <= settings.lat_max:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Latitude {lat} is outside the ANTARBODH prototype domain "
                f"({settings.lat_min} to {settings.lat_max})."
            ),
        )

    if not settings.lon_min <= lon <= settings.lon_max:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Longitude {lon} is outside the ANTARBODH prototype domain "
                f"({settings.lon_min} to {settings.lon_max})."
            ),
        )


@router.get("/profile")
def get_argo_profile(
    date: str = Query(..., description="Requested date, YYYY-MM-DD"),
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Return the nearest independent ARGO profile."""

    # Validate date format, but retain the original ISO string
    # because ArgoService.get_profile() expects date: str.
    try:
        Date.fromisoformat(date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date. Expected YYYY-MM-DD.",
        )

    _validate_location(lat, lon)

    try:
        result = argo_service.get_profile(
            date=date,
            lat=lat,
            lon=lon,
            max_distance_km=settings.argo_max_distance_km,
            date_tolerance_days=settings.argo_date_tolerance_days,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"ARGO profile lookup failed: {exc}",
        )

    if result is None:
        return {
            "available": False,
            "date_requested": date,
            "reason": "No suitable ARGO profile found within the configured matching tolerances.",
            "source": "IFREMER GDAC ARGO",
            "usage": "independent_validation",
        }

    return result


@router.get("/observation")
def get_argo_observation(
    date: str = Query(..., description="Requested date, YYYY-MM-DD"),
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    depth: float = Query(..., ge=0, description="Requested depth in meters"),
):
    """Return the nearest independent ARGO observation."""

    # Validate date format, but retain the original ISO string
    # because ArgoService.get_observation() expects date: str.
    try:
        Date.fromisoformat(date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date. Expected YYYY-MM-DD.",
        )

    _validate_location(lat, lon)

    try:
        result = argo_service.get_observation(
            date=date,
            lat=lat,
            lon=lon,
            depth_m=depth,
            max_distance_km=settings.argo_max_distance_km,
            date_tolerance_days=settings.argo_date_tolerance_days,
            max_depth_difference_m=settings.argo_max_depth_difference_m,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"ARGO observation lookup failed: {exc}",
        )

    return result