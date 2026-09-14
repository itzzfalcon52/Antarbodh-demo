"""Vertical temperature profile route."""

from fastapi import APIRouter, Query, HTTPException
from backend.app.services.interpolation_service import interpolation_service
from backend.app.schemas.profile import ProfileResponse

router = APIRouter(tags=["profile"])

@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    date: str = Query(..., description="Date in YYYY-MM-DD format (2025)"),
    lat: float = Query(..., description="Latitude in degrees North [5.0, 20.0]"),
    lon: float = Query(..., description="Longitude in degrees East [80.0, 100.0]")
):
    try:
        profile = interpolation_service.get_vertical_profile(date_str=date, lat=lat, lon=lon)
        return profile
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to interpolate profile: {str(e)}")
