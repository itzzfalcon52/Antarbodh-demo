"""Routes package initialization."""

from fastapi import APIRouter
from .health import router as health_router
from .metadata import router as metadata_router
from .temperature import router as temperature_router
from .profile import router as profile_router
from .surface import router as surface_router
from .validation import router as validation_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(metadata_router)
api_router.include_router(temperature_router)
api_router.include_router(profile_router)
api_router.include_router(surface_router)
api_router.include_router(validation_router)

__all__ = ["api_router"]
