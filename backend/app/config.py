"""Backend configuration for ANTARBODH FastAPI application."""

import os
from pathlib import Path
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[2]

class Settings(BaseModel):
    PROJECT_NAME: str = "ANTARBODH Backend"
    API_V1_STR: str = "/api"
    
    # Model and prediction paths
    CHECKPOINT_PATH: Path = PROJECT_ROOT / "outputs/checkpoints/antarbodh_cnn_v1_sih2026.pt"
    PREDICTIONS_NC_PATH: Path = PROJECT_ROOT / "outputs/inference/2025/antarbodh_2025_predictions.nc"
    PREDICTIONS_META_PATH: Path = PROJECT_ROOT / "outputs/inference/2025/metadata.json"
    TEST_NC_PATH: Path = PROJECT_ROOT / "data/processed/test.nc"
    NORM_STATS_PATH: Path = PROJECT_ROOT / "data/processed/normalization_stats.nc"
    
    # Validation report paths
    VALIDATION_JSON_PATH: Path = PROJECT_ROOT / "outputs/evaluation/argo_glorys_comparison_report.json"
    VALIDATION_DEPTH_CSV_PATH: Path = PROJECT_ROOT / "outputs/evaluation/argo_glorys_comparison_per_depth.csv"
    VALIDATION_PROFILES_CSV_PATH: Path = PROJECT_ROOT / "outputs/evaluation/argo_glorys_comparison_profile_metrics.csv"
    
    # Domain boundaries (Bay of Bengal prototype domain)
    LAT_MIN: float = 5.0
    LAT_MAX: float = 20.0
    LON_MIN: float = 80.0
    LON_MAX: float = 100.0
    RESOLUTION_DEG: float = 0.25
    
    # Grid dimensions (cell centers: 60 x 80)
    NUM_LAT: int = 60
    NUM_LON: int = 80
    
    # Supported temporal range
    DATE_START: str = "2025-01-01"
    DATE_END: str = "2025-12-31"
    
    # Canonical target depths (15 levels)
    CANONICAL_DEPTHS: list[float] = [
        0.0, 5.0, 10.0, 20.0, 30.0, 50.0, 75.0, 100.0,
        125.0, 150.0, 200.0, 300.0, 500.0, 700.0, 1000.0
    ]
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

settings = Settings()
