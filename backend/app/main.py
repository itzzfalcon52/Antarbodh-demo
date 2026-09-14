"""ANTARBODH FastAPI Application Entrypoint.

AI-Powered Subsurface Ocean Intelligence REST API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys

# Ensure repository root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.config import settings
from backend.app.api.routes import api_router

app = FastAPI(
    title="ANTARBODH Backend API",
    description="REST API for ANTARBODH — AI-Powered Subsurface Ocean Intelligence",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"], # Allow development frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes under both /api/v1 and /api
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "project": "ANTARBODH",
        "description": "AI-Powered Subsurface Ocean Intelligence",
        "slogan": "From Surface Signals to Subsurface Intelligence",
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
