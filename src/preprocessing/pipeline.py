"""ANTARBODH end-to-end preprocessing pipeline.

Orchestrates: config → load → QC → regrid → build → validate
Supports --validate-only mode for lightweight auditing without regeneration.
"""

import argparse
import sys
import time
from pathlib import Path

# Ensure repository root is on sys.path for direct execution
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import dask
from src.preprocessing.config import (
    load_preprocessing_config, build_common_grid, PreprocessingConfig,
)
from src.preprocessing.loader import load_raw_datasets
from src.preprocessing.qc import apply_quality_control
from src.preprocessing.regrid import (
    build_canonical_time_axis,
    regrid_surface_variables,
    regrid_glorys_target,
)
from src.preprocessing.builder import build_and_save_ml_datasets, validate_processed_dataset


def run_pipeline(
    config_path: str = None,
    raw_dir: str = None,
    processed_dir: str = None,
    workers: int = 4,
    skip_qc_report: bool = False,
    validate_only: bool = False,
):
    """Execute the full oceanographic preprocessing pipeline."""
    start_time = time.time()

    print("=" * 70)
    print("ANTARBODH — Oceanographic Preprocessing Pipeline")
    print("=" * 70)

    # 1. Load and validate configuration
    cfg = load_preprocessing_config(
        config_path=Path(config_path) if config_path else None,
        raw_dir_override=Path(raw_dir) if raw_dir else None,
        processed_dir_override=Path(processed_dir) if processed_dir else None,
        workers=workers,
    )

    # 2. Configure Dask
    dask.config.set(scheduler="threads", num_workers=cfg.dask_workers)
    print(f"Dask Scheduler: Threaded ({cfg.dask_workers} worker threads)")
    print(f"Raw Data Dir:   {cfg.raw_dir}")
    print(f"Processed Dir:  {cfg.processed_dir}")
    print(f"Outputs Dir:    {cfg.outputs_dir}")
    print(f"Time Range:     {cfg.time_start} → {cfg.time_end}")
    print(f"Split:          Train ≤{cfg.train_end_year} | Val {cfg.val_year} | Test {cfg.test_year}")
    print("-" * 70)

    # ── Validate-only mode ────────────────────────────────────────────────
    if validate_only:
        print("\n[VALIDATE-ONLY MODE] Checking existing processed datasets...")
        if not cfg.processed_dir.exists():
            print(f"✗ Processed directory does not exist: {cfg.processed_dir}")
            return
        validate_processed_dataset(cfg.processed_dir, cfg)
        elapsed = time.time() - start_time
        print(f"\nValidation completed in {elapsed:.1f}s")
        return

    # 3. Build common grid
    common_lat, common_lon = build_common_grid(cfg)

    # 4. Build canonical daily time axis
    canonical_time = build_canonical_time_axis(cfg)
    print(f"Canonical daily time axis: {canonical_time[0].date()} → {canonical_time[-1].date()} ({len(canonical_time)} days)")

    # 5. Load raw datasets (explicit file selection, variable validation)
    raw_datasets = load_raw_datasets(cfg)

    # 6. Quality Control and physical range filtering
    qc_vars = apply_quality_control(
        raw_datasets,
        cfg=cfg,
        output_dir=cfg.outputs_dir,
        export_report=not skip_qc_report,
    )

    # 7. Regrid to common grid and align to canonical time
    surface_common = regrid_surface_variables(
        qc_vars, common_lat, common_lon, canonical_time,
        interp_method=cfg.interpolation_method,
    )

    thetao_common = regrid_glorys_target(
        qc_vars["glorys"],
        target_depths=cfg.target_depths,
        common_lat=common_lat,
        common_lon=common_lon,
        canonical_time=canonical_time,
        interp_method=cfg.interpolation_method,
    )

    # 8. ML dataset construction, splitting, normalization, and export
    train_ds, val_ds, test_ds, norm_stats = build_and_save_ml_datasets(
        surface_common=surface_common,
        thetao_common=thetao_common,
        cfg=cfg,
    )

    # 9. Post-build validation
    validate_processed_dataset(cfg.processed_dir, cfg)

    elapsed = time.time() - start_time
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)

    print("=" * 70)
    print(f"PIPELINE COMPLETE in {minutes}m {seconds}s!")
    print(f"Outputs saved to: {cfg.processed_dir.resolve()}")
    print("  - train.nc")
    print("  - val.nc")
    print("  - test.nc")
    print("  - normalization_stats.nc")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="ANTARBODH: End-to-end Oceanographic Preprocessing Pipeline"
    )
    parser.add_argument(
        "--config", type=str, default=None,
        help="Path to YAML configuration file (default: configs/prototype.yaml)",
    )
    parser.add_argument(
        "--raw-dir", type=str, default=None,
        help="Directory containing raw NetCDF data (default: data/raw)",
    )
    parser.add_argument(
        "--output-dir", type=str, default=None,
        help="Directory to save processed datasets (default: data/processed)",
    )
    parser.add_argument(
        "--workers", type=int, default=4,
        help="Number of Dask worker threads (default: 4)",
    )
    parser.add_argument(
        "--skip-qc-report", action="store_true",
        help="Skip computing and writing the QC CSV report",
    )
    parser.add_argument(
        "--validate-only", action="store_true",
        help="Only validate existing processed datasets without regenerating",
    )

    args = parser.parse_args()

    run_pipeline(
        config_path=args.config,
        raw_dir=args.raw_dir,
        processed_dir=args.output_dir,
        workers=args.workers,
        skip_qc_report=args.skip_qc_report,
        validate_only=args.validate_only,
    )


if __name__ == "__main__":
    main()
