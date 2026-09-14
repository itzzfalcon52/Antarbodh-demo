"""
ANTARBODH Preprocessing Package
===============================
Provides modular components and end-to-end orchestration for transforming
multi-source oceanographic satellite and reanalysis observations into
aligned, standardized multi-channel deep learning tensors.

Pipeline architecture:
    config.py   → Configuration loading, validation, grid construction
    loader.py   → Explicit dataset loading with variable validation
    qc.py       → Quality control, wind resampling, coverage reporting
    regrid.py   → Spatial/temporal harmonization, vertical interpolation
    builder.py  → Normalization, 14-channel assembly, serialization, audit
    pipeline.py → End-to-end orchestration with --validate-only mode
"""

from src.preprocessing.config import (
    PreprocessingConfig,
    QCThresholds,
    load_preprocessing_config,
    build_common_grid,
    validate_config,
    PHYSICAL_CHANNELS,
    MASK_CHANNELS,
    ALL_CHANNELS,
)
from src.preprocessing.loader import load_raw_datasets
from src.preprocessing.qc import apply_quality_control
from src.preprocessing.regrid import (
    build_canonical_time_axis,
    regrid_surface_variables,
    regrid_glorys_target,
)
from src.preprocessing.builder import build_and_save_ml_datasets, validate_processed_dataset


def run_pipeline(*args, **kwargs):
    """Lazy import wrapper for the main pipeline execution."""
    from src.preprocessing.pipeline import run_pipeline as _run
    return _run(*args, **kwargs)


__all__ = [
    "PreprocessingConfig",
    "QCThresholds",
    "load_preprocessing_config",
    "build_common_grid",
    "validate_config",
    "PHYSICAL_CHANNELS",
    "MASK_CHANNELS",
    "ALL_CHANNELS",
    "load_raw_datasets",
    "apply_quality_control",
    "build_canonical_time_axis",
    "regrid_surface_variables",
    "regrid_glorys_target",
    "build_and_save_ml_datasets",
    "validate_processed_dataset",
    "run_pipeline",
]
