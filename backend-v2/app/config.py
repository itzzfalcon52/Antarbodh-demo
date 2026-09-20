from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class InferenceAvailabilityPolicy(BaseSettings):
    """
    Policy for determining whether inference can proceed
    given partial surface observations.

    NOTE:
    This policy is retained for compatibility with the existing
    application structure. Runtime prediction now consumes the
    already-preprocessed test.nc dataset.
    """

    allow_partial_inputs: bool = True

    max_missing_physical_channels: int = 1

    mandatory_channels: list[str] = [
        "sst",
        "ssh",
        "current_u",
        "current_v",
        "wind_u",
        "wind_v",
    ]


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # ---------------------------------------------------------
    # On-demand inference window
    # ---------------------------------------------------------

    inference_start_date: str = "2025-01-01"

    inference_end_date: str = "2025-12-31"

    # ---------------------------------------------------------
    # ARGO validation
    # ---------------------------------------------------------

    argo_data_root: Path = (
        PROJECT_ROOT / "data" / "argo"
    )

    # Optional explicit CSV path.
    # Leave as None when there is exactly one CSV
    # in data/argo.
    argo_csv_path: Path | None = None

    argo_max_distance_km: float = 100.0

    argo_date_tolerance_days: int = 1

    argo_max_depth_difference_m: float = 25.0

    # ---------------------------------------------------------
    # Model
    # ---------------------------------------------------------

    model_id: str = "antarbodh_cnn_v1_sih2026"

    checkpoint_path: Path = (
        PROJECT_ROOT
        / "data"
        / "model"
        / "antarbodh_cnn_v1_sih2026.pt"
    )

    # Retained because other parts of the application may
    # still reference it. Prediction inference itself does
    # NOT need normalization statistics because test.nc/X
    # is already normalized.
    

    # ---------------------------------------------------------
    # Preprocessed inference dataset
    # ---------------------------------------------------------

    test_data_path: Path = PROJECT_ROOT / "data" / "inference_inputs.nc"

    # ---------------------------------------------------------
    # Historical prediction
    # ---------------------------------------------------------

    historical_prediction_path: Path = (
        PROJECT_ROOT
        / "data"
        / "historical"
        / "antarbodh_2025_predictions.nc"
    )

    # ---------------------------------------------------------
    # On-demand prediction cache
    # ---------------------------------------------------------

    on_demand_prediction_cache_dir: Path = (
        PROJECT_ROOT
        / "outputs"
        / "inference"
        / "on_demand"
        / "antarbodh_cnn_v1_sih2026"
        / "preprocessing_v1"
    )

    # ---------------------------------------------------------
    # Validation
    # ---------------------------------------------------------

    argo_validation_report: Path = (
        PROJECT_ROOT
        / "data"
        / "validation"
        / "argo_glorys_comparison_report.json"
    )

    # ---------------------------------------------------------
    # Domain
    # ---------------------------------------------------------

    lat_min: float = 5.0

    lat_max: float = 20.0

    lon_min: float = 80.0

    lon_max: float = 100.0

    resolution: float = 0.25

    # ---------------------------------------------------------
    # Channels
    # ---------------------------------------------------------

    input_channels: int = 14

    channel_names: list[str] = [
        "sst",
        "sss",
        "ssh",
        "current_u",
        "current_v",
        "wind_u",
        "wind_v",
        "sst_mask",
        "sss_mask",
        "ssh_mask",
        "current_u_mask",
        "current_v_mask",
        "wind_u_mask",
        "wind_v_mask",
    ]

    target_depths: list[float] = [
        0,
        5,
        10,
        20,
        30,
        50,
        75,
        100,
        125,
        150,
        200,
        300,
        500,
        700,
        1000,
    ]

    # ---------------------------------------------------------
    # Inference policy
    # ---------------------------------------------------------

    inference_policy: InferenceAvailabilityPolicy = (
        InferenceAvailabilityPolicy()
    )

    # ---------------------------------------------------------
    # CORS
    # ---------------------------------------------------------

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://antarbodh-demo.vercel.app",
    ]


settings = Settings()