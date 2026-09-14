"""Validation metrics routes."""

from fastapi import APIRouter, HTTPException
from backend.app.services.validation_service import validation_service
from backend.app.schemas.validation import ValidationSummaryResponse, ValidationDepthResponse

router = APIRouter(tags=["validation"])

@router.get("/validation", response_model=ValidationSummaryResponse)
def get_validation_summary():
    try:
        return validation_service.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load validation summary: {str(e)}")

@router.get("/validation/depth", response_model=ValidationDepthResponse)
def get_validation_depth():
    try:
        metrics = validation_service.get_depth_metrics()
        return {"depth_metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load depth validation metrics: {str(e)}")

@router.get("/validation/argo/matched")
def get_validation_argo_matched():
    try:
        profiles = validation_service.get_matched_profiles()
        return {
            "total_profiles": len(profiles),
            "profiles": profiles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load matched ARGO profiles: {str(e)}")
