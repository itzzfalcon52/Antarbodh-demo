"""Surface observations route."""

from fastapi import APIRouter, Query, HTTPException
from backend.app.services.surface_service import surface_service
from backend.app.schemas.surface import SurfaceConditionsResponse

router = APIRouter(tags=["surface"])

@router.get("/surface", response_model=SurfaceConditionsResponse)
@router.get("/surface/conditions", response_model=SurfaceConditionsResponse)
def get_surface(
    date: str = Query(..., description="Date in YYYY-MM-DD format (2025)"),
    lat: float = Query(..., description="Latitude in degrees North [5.0, 20.0]"),
    lon: float = Query(..., description="Longitude in degrees East [80.0, 100.0]")
):
    try:
        data = surface_service.get_surface_conditions(date_str=date, lat=lat, lon=lon)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve surface observations: {str(e)}")
