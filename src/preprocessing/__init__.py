"""
ANTARBODH Preprocessing Package
===============================
Provides modular components and end-to-end orchestration for transforming
multi-source oceanographic satellite and reanalysis observations into
aligned, standardized multi-channel deep learning tensors.
"""

from src.preprocessing.config import PreprocessingConfig, load_preprocessing_config
from src.preprocessing.loader import load_raw_datasets, find_raw_file
from src.preprocessing.qc import apply_quality_control
from src.preprocessing.regrid import (
    build_common_grid,
    regrid_surface_variables,
    regrid_glorys_target,
)
from src.preprocessing.builder import build_and_save_ml_datasets


def run_pipeline(*args, **kwargs):
    """Lazy import wrapper for the main pipeline execution."""
    from src.preprocessing.pipeline import run_pipeline as _run
    return _run(*args, **kwargs)


__all__ = [
    "PreprocessingConfig",
    "load_preprocessing_config",
    "load_raw_datasets",
    "find_raw_file",
    "apply_quality_control",
    "build_common_grid",
    "regrid_surface_variables",
    "regrid_glorys_target",
    "build_and_save_ml_datasets",
    "run_pipeline",
]
