import os
from pathlib import Path
from pydantic_settings import BaseSettings

class InferenceAvailabilityPolicy(BaseSettings):
    """
    Policy for determining if inference can proceed given partial surface data.
    """
    allow_partial_inputs: bool = True
    # The maximum number of missing physical channels allowed
    max_missing_physical_channels: int = 1
    # Channels that are absolutely mandatory for inference.
    # We will enforce that at least SST, SSH, Current U, Current V, Wind U, Wind V are present.
    # Meaning SSS is allowed to be missing.
    mandatory_channels: list[str] = ["sst", "ssh", "current_u", "current_v", "wind_u", "wind_v"]

class Settings(BaseSettings):
    # Model
    model_id: str = "antarbodh_cnn_v1_sih2026"
    checkpoint_path: Path = Path("outputs/checkpoints/antarbodh_cnn_v1_sih2026.pt")
    normalization_stats_path: Path = Path("data/processed/normalization_stats.nc")

    # Data
    surface_data_root: Path = Path("data/raw")
    historical_prediction_path: Path = Path("outputs/inference/2025/antarbodh_2025_predictions.nc")
    on_demand_prediction_cache_dir: Path = Path("outputs/inference/on_demand/antarbodh_cnn_v1_sih2026/preprocessing_v1")
    argo_validation_report: Path = Path("outputs/evaluation/argo_benchmark.json")

    # Domain
    lat_min: float = 5.0
    lat_max: float = 20.0
    lon_min: float = 80.0
    lon_max: float = 100.0
    resolution: float = 0.25

    # Channels and Depths
    input_channels: int = 14
    channel_names: list[str] = [
        "sst", "sss", "ssh", "current_u", "current_v", "wind_u", "wind_v",
        "sst_mask", "sss_mask", "ssh_mask", "current_u_mask", "current_v_mask", "wind_u_mask", "wind_v_mask"
    ]
    target_depths: list[float] = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]

    # Sub-policies
    inference_policy: InferenceAvailabilityPolicy = InferenceAvailabilityPolicy()

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

settings = Settings()
