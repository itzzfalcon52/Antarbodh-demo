"""Configuration loader and path resolution for ANTARBODH preprocessing."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
import yaml


@dataclass
class PreprocessingConfig:
    """Dataclass holding preprocessing parameters and paths."""

    project_root: Path
    raw_dir: Path
    processed_dir: Path
    outputs_dir: Path
    figures_dir: Path
    reports_dir: Path

    min_lat: float = 5.0
    max_lat: float = 20.0
    min_lon: float = 80.0
    max_lon: float = 100.0
    grid_resolution: float = 0.25

    target_depths: List[float] = field(
        default_factory=lambda: [
            0.0, 5.0, 10.0, 20.0, 30.0, 50.0, 75.0, 100.0,
            125.0, 150.0, 200.0, 300.0, 500.0, 700.0, 1000.0
        ]
    )

    train_end_year: int = 2023
    val_year: int = 2024
    test_year: int = 2025

    dask_workers: int = 4
    compression_level: int = 4


def get_default_project_root() -> Path:
    """Resolve project root directory relative to this file."""
    return Path(__file__).resolve().parent.parent.parent


def load_preprocessing_config(
    config_path: Optional[Path] = None,
    raw_dir_override: Optional[Path] = None,
    processed_dir_override: Optional[Path] = None,
    workers: Optional[int] = None,
) -> PreprocessingConfig:
    """Load configuration from prototype.yaml or fallback to standard defaults."""
    project_root = get_default_project_root()

    if config_path is None:
        config_path = project_root / "configs" / "prototype.yaml"

    cfg_dict = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            cfg_dict = yaml.safe_load(f) or {}

    raw_dir = raw_dir_override or project_root / "data" / "raw"
    processed_dir = processed_dir_override or project_root / "data" / "processed"
    outputs_dir = project_root / "outputs"
    figures_dir = outputs_dir / "figures"
    reports_dir = outputs_dir / "reports"

    # Read config parameters if available
    region = cfg_dict.get("region", {})
    min_lat = float(region.get("min_lat", 5.0))
    max_lat = float(region.get("max_lat", 20.0))
    min_lon = float(region.get("min_lon", 80.0))
    max_lon = float(region.get("max_lon", 100.0))

    target_grid = cfg_dict.get("target_grid", {})
    grid_resolution = float(target_grid.get("resolution_lat", 0.25))

    target_depths = [float(d) for d in cfg_dict.get("target_depths", [
        0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000
    ])]

    return PreprocessingConfig(
        project_root=project_root,
        raw_dir=Path(raw_dir),
        processed_dir=Path(processed_dir),
        outputs_dir=outputs_dir,
        figures_dir=figures_dir,
        reports_dir=reports_dir,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        grid_resolution=grid_resolution,
        target_depths=target_depths,
        dask_workers=workers if workers is not None else 4,
    )
