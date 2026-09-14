"""Temperature slice route."""

from fastapi import APIRouter, Query, HTTPException
from backend.app.services.prediction_service import prediction_service
from backend.app.schemas.temperature import TemperatureSliceResponse

router = APIRouter(tags=["temperature"])

@router.get("/temperature", response_model=TemperatureSliceResponse)
def get_temperature(
    date: str = Query(..., description="Date in YYYY-MM-DD format (2025)"),
    depth: float = Query(..., description="Canonical depth in meters")
):
    try:
        data = prediction_service.get_temperature_slice(date_str=date, depth=depth)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract temperature slice: {str(e)}")
