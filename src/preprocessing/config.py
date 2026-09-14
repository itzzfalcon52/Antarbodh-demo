"""Configuration loader, validation, and grid construction for ANTARBODH preprocessing.

The YAML config (configs/prototype.yaml) is the SINGLE SOURCE OF TRUTH.
Python functions consume configuration — they do NOT silently override it.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import xarray as xr
import yaml


# ── Deterministic channel specification ──────────────────────────────────────

PHYSICAL_CHANNELS = ["SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V"]
MASK_CHANNELS = [f"{c}_mask" for c in PHYSICAL_CHANNELS]
ALL_CHANNELS = PHYSICAL_CHANNELS + MASK_CHANNELS  # exactly 14


# ── QC threshold container ───────────────────────────────────────────────────

@dataclass
class QCThresholds:
    """Physical-range QC bounds. Values outside are set to NaN."""
    sst_min: float = -2.0
    sst_max: float = 40.0
    sss_min: float = 0.0
    sss_max: float = 38.0   # Dataset-specific anomaly filter, NOT universal law
    ssh_min: float = -5.0
    ssh_max: float = 5.0
    current_min: float = -5.0
    current_max: float = 5.0
    wind_min: float = -50.0
    wind_max: float = 50.0
    thetao_min: float = -2.0
    thetao_max: float = 40.0


# ── Source file specification ────────────────────────────────────────────────

@dataclass
class SourceFile:
    """Explicit specification for a single raw dataset file."""
    directory: str
    filename: str
    expected_variable: Optional[str] = None
    expected_variables: Optional[List[str]] = None
    product_level: str = "L4"
    product_id: str = ""
    units_conversion: Optional[str] = None
    temporal_resolution: str = "daily"
    # Legacy SSS fallback
    legacy_ascending: Optional[str] = None
    legacy_descending: Optional[str] = None
    legacy_variable: Optional[str] = None


# ── Main config ──────────────────────────────────────────────────────────────

@dataclass
class PreprocessingConfig:
    """Complete preprocessing configuration loaded from YAML."""

    project_root: Path
    raw_dir: Path
    processed_dir: Path
    outputs_dir: Path
    figures_dir: Path
    reports_dir: Path

    # Domain edges (NOT cell centers)
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

    # Temporal
    time_start: str = "2020-01-01"
    time_end: str = "2025-12-31"

    # Chronological split
    train_end_year: int = 2023
    val_year: int = 2024
    test_year: int = 2025

    # QC
    qc: QCThresholds = field(default_factory=QCThresholds)

    # Wind resampling
    wind_min_hourly_obs_per_day: int = 18

    # Processing
    interpolation_method: str = "linear"
    dask_workers: int = 4
    compression_level: int = 4

    # Source files (populated from YAML)
    source_files: Dict[str, SourceFile] = field(default_factory=dict)


def get_default_project_root() -> Path:
    """Resolve project root directory relative to this file."""
    return Path(__file__).resolve().parent.parent.parent


def build_common_grid(cfg: PreprocessingConfig) -> Tuple[xr.DataArray, xr.DataArray]:
    """
    Construct the cell-centered 0.25° target grid from domain edges.

    Domain edges (from config):
        latitude:  min_lat → max_lat   (e.g. 5.0 → 20.0)
        longitude: min_lon → max_lon   (e.g. 80.0 → 100.0)

    Cell centers are computed as:
        start_center = min_edge + resolution / 2
        end_center   = max_edge - resolution / 2

    For the prototype this gives:
        latitude:  5.125, 5.375, ..., 19.875  (60 cells)
        longitude: 80.125, 80.375, ..., 99.875 (80 cells)
    """
    res = cfg.grid_resolution

    lat_start = cfg.min_lat + res / 2.0
    lat_end = cfg.max_lat - res / 2.0
    lon_start = cfg.min_lon + res / 2.0
    lon_end = cfg.max_lon - res / 2.0

    n_lat = int(round((cfg.max_lat - cfg.min_lat) / res))
    n_lon = int(round((cfg.max_lon - cfg.min_lon) / res))

    lats = np.linspace(lat_start, lat_end, n_lat)
    lons = np.linspace(lon_start, lon_end, n_lon)

    # ── Assertions ───────────────────────────────────────────────────────
    assert len(lats) == n_lat, f"Expected {n_lat} lat cells, got {len(lats)}"
    assert len(lons) == n_lon, f"Expected {n_lon} lon cells, got {len(lons)}"

    # For the current prototype: 60 lat × 80 lon
    expected_n_lat = int(round((cfg.max_lat - cfg.min_lat) / res))
    expected_n_lon = int(round((cfg.max_lon - cfg.min_lon) / res))
    assert len(lats) == expected_n_lat, f"Lat cell count mismatch: {len(lats)} vs expected {expected_n_lat}"
    assert len(lons) == expected_n_lon, f"Lon cell count mismatch: {len(lons)} vs expected {expected_n_lon}"

    # Verify first/last centers with tolerance
    tol = 1e-6
    assert abs(lats[0] - lat_start) < tol, f"First lat center {lats[0]} != {lat_start}"
    assert abs(lats[-1] - lat_end) < tol, f"Last lat center {lats[-1]} != {lat_end}"
    assert abs(lons[0] - lon_start) < tol, f"First lon center {lons[0]} != {lon_start}"
    assert abs(lons[-1] - lon_end) < tol, f"Last lon center {lons[-1]} != {lon_end}"

    # Verify spacing
    if len(lats) > 1:
        spacing = np.diff(lats)
        assert np.allclose(spacing, res, atol=1e-6), f"Lat spacing not uniform: {spacing}"
    if len(lons) > 1:
        spacing = np.diff(lons)
        assert np.allclose(spacing, res, atol=1e-6), f"Lon spacing not uniform: {spacing}"

    common_lat = xr.DataArray(lats, dims="latitude", name="latitude")
    common_lon = xr.DataArray(lons, dims="longitude", name="longitude")

    print(f"Common grid: {len(lats)} lat × {len(lons)} lon")
    print(f"  Lat: {lats[0]:.3f} → {lats[-1]:.3f} (spacing {res}°)")
    print(f"  Lon: {lons[0]:.3f} → {lons[-1]:.3f} (spacing {res}°)")

    return common_lat, common_lon


def validate_config(cfg: PreprocessingConfig) -> None:
    """Validate configuration parameters. Fails early with useful messages."""
    # Domain
    assert cfg.min_lat < cfg.max_lat, f"min_lat ({cfg.min_lat}) must be < max_lat ({cfg.max_lat})"
    assert cfg.min_lon < cfg.max_lon, f"min_lon ({cfg.min_lon}) must be < max_lon ({cfg.max_lon})"
    assert cfg.grid_resolution > 0, f"grid_resolution must be > 0, got {cfg.grid_resolution}"

    # Target depths
    assert len(cfg.target_depths) > 0, "target_depths must not be empty"
    assert all(d >= 0 for d in cfg.target_depths), "All target depths must be >= 0"
    assert cfg.target_depths == sorted(cfg.target_depths), "target_depths must be sorted ascending"

    # Split years
    assert cfg.train_end_year < cfg.val_year, \
        f"train_end_year ({cfg.train_end_year}) must be < val_year ({cfg.val_year})"
    assert cfg.val_year <= cfg.test_year, \
        f"val_year ({cfg.val_year}) must be <= test_year ({cfg.test_year})"

    # Date range covers all splits
    import pandas as pd
    start_year = pd.Timestamp(cfg.time_start).year
    end_year = pd.Timestamp(cfg.time_end).year
    assert start_year <= cfg.train_end_year, \
        f"time_start year ({start_year}) must be <= train_end_year ({cfg.train_end_year})"
    assert end_year >= cfg.test_year, \
        f"time_end year ({end_year}) must be >= test_year ({cfg.test_year})"

    # Wind coverage
    assert 1 <= cfg.wind_min_hourly_obs_per_day <= 24, \
        f"wind_min_hourly_obs_per_day must be 1–24, got {cfg.wind_min_hourly_obs_per_day}"

    # QC thresholds
    qc = cfg.qc
    assert qc.sst_min < qc.sst_max, "SST QC bounds invalid"
    assert qc.sss_min < qc.sss_max, "SSS QC bounds invalid"
    assert qc.ssh_min < qc.ssh_max, "SSH QC bounds invalid"
    assert qc.current_min < qc.current_max, "Current QC bounds invalid"
    assert qc.wind_min < qc.wind_max, "Wind QC bounds invalid"
    assert qc.thetao_min < qc.thetao_max, "Thetao QC bounds invalid"

    print("✓ Configuration validation passed.")


def _parse_source_files(cfg_dict: dict) -> Dict[str, SourceFile]:
    """Parse data_sources section from YAML into SourceFile objects."""
    sources = {}
    ds_section = cfg_dict.get("data_sources", {})

    for key, spec in ds_section.items():
        if not isinstance(spec, dict):
            continue
        sources[key] = SourceFile(
            directory=spec.get("directory", ""),
            filename=spec.get("filename", ""),
            expected_variable=spec.get("expected_variable"),
            expected_variables=spec.get("expected_variables"),
            product_level=spec.get("product_level", "L4"),
            product_id=spec.get("product_id", ""),
            units_conversion=spec.get("units_conversion"),
            temporal_resolution=spec.get("temporal_resolution", "daily"),
            legacy_ascending=spec.get("legacy_ascending"),
            legacy_descending=spec.get("legacy_descending"),
            legacy_variable=spec.get("legacy_variable"),
        )
    return sources


def load_preprocessing_config(
    config_path: Optional[Path] = None,
    raw_dir_override: Optional[Path] = None,
    processed_dir_override: Optional[Path] = None,
    workers: Optional[int] = None,
) -> PreprocessingConfig:
    """Load configuration from prototype.yaml and validate."""
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

    # Region (domain edges)
    region = cfg_dict.get("region", {})
    min_lat = float(region.get("min_lat", 5.0))
    max_lat = float(region.get("max_lat", 20.0))
    min_lon = float(region.get("min_lon", 80.0))
    max_lon = float(region.get("max_lon", 100.0))

    # Grid
    target_grid = cfg_dict.get("target_grid", {})
    grid_resolution = float(target_grid.get("resolution", 0.25))

    # Target depths
    target_depths = [float(d) for d in cfg_dict.get("target_depths", [
        0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000
    ])]

    # Temporal
    time_cfg = cfg_dict.get("time", {})
    time_start = time_cfg.get("start", "2020-01-01")
    time_end = time_cfg.get("end", "2025-12-31")

    # Split
    split_cfg = cfg_dict.get("split", {})
    train_end_year = int(split_cfg.get("train_end_year", 2023))
    val_year = int(split_cfg.get("val_year", 2024))
    test_year = int(split_cfg.get("test_year", 2025))

    # QC thresholds
    qc_cfg = cfg_dict.get("qc_thresholds", {})
    qc = QCThresholds(
        sst_min=float(qc_cfg.get("sst", {}).get("min", -2.0)),
        sst_max=float(qc_cfg.get("sst", {}).get("max", 40.0)),
        sss_min=float(qc_cfg.get("sss", {}).get("min", 0.0)),
        sss_max=float(qc_cfg.get("sss", {}).get("max", 38.0)),
        ssh_min=float(qc_cfg.get("ssh", {}).get("min", -5.0)),
        ssh_max=float(qc_cfg.get("ssh", {}).get("max", 5.0)),
        current_min=float(qc_cfg.get("currents", {}).get("min", -5.0)),
        current_max=float(qc_cfg.get("currents", {}).get("max", 5.0)),
        wind_min=float(qc_cfg.get("winds", {}).get("min", -50.0)),
        wind_max=float(qc_cfg.get("winds", {}).get("max", 50.0)),
        thetao_min=float(qc_cfg.get("thetao", {}).get("min", -2.0)),
        thetao_max=float(qc_cfg.get("thetao", {}).get("max", 40.0)),
    )

    # Wind resampling
    wind_min = int(cfg_dict.get("wind_min_hourly_obs_per_day", 18))

    # Processing
    proc = cfg_dict.get("processing", {})
    interp_method = proc.get("interpolation_method", "linear")
    dask_workers_val = workers if workers is not None else int(proc.get("dask_workers", 4))
    compression = int(proc.get("compression_level", 4))

    # Source files
    source_files = _parse_source_files(cfg_dict)

    cfg = PreprocessingConfig(
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
        time_start=time_start,
        time_end=time_end,
        train_end_year=train_end_year,
        val_year=val_year,
        test_year=test_year,
        qc=qc,
        wind_min_hourly_obs_per_day=wind_min,
        interpolation_method=interp_method,
        dask_workers=dask_workers_val,
        compression_level=compression,
        source_files=source_files,
    )

    validate_config(cfg)
    return cfg
