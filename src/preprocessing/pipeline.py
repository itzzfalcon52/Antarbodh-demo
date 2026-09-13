import argparse
import sys
import time
from pathlib import Path

# Ensure repository root is on sys.path for direct execution (e.g. python src/preprocessing/pipeline.py)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import dask
from src.preprocessing.config import load_preprocessing_config
from src.preprocessing.loader import load_raw_datasets
from src.preprocessing.qc import apply_quality_control
from src.preprocessing.regrid import build_common_grid, regrid_surface_variables, regrid_glorys_target
from src.preprocessing.builder import build_and_save_ml_datasets



def run_pipeline(
    config_path: str = None,
    raw_dir: str = None,
    processed_dir: str = None,
    workers: int = 4,
    skip_qc_report: bool = False,
):
    """Execute the full oceanographic preprocessing pipeline."""
    start_time = time.time()

    print("=" * 70)
    print("ANTARBODH — Oceanographic Preprocessing Pipeline")
    print("=" * 70)

    # 1. Load configuration
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
    print("-" * 70)

    # 3. Load raw datasets
    raw_datasets = load_raw_datasets(cfg.raw_dir)

    # 4. Quality Control and physical range filtering
    qc_vars = apply_quality_control(
        raw_datasets,
        output_dir=cfg.outputs_dir,
        export_report=not skip_qc_report,
    )

    # 5. Build common grid and regrid
    common_lat, common_lon = build_common_grid(
        min_lat=cfg.min_lat,
        max_lat=cfg.max_lat,
        min_lon=cfg.min_lon,
        max_lon=cfg.max_lon,
        resolution=cfg.grid_resolution,
    )

    surface_common = regrid_surface_variables(qc_vars, common_lat, common_lon)

    thetao_common = regrid_glorys_target(
        qc_vars["glorys"],
        target_depths=cfg.target_depths,
        common_lat=common_lat,
        common_lon=common_lon,
    )

    # 6. ML dataset construction, splitting, normalization, and export
    train_ds, val_ds, test_ds, norm_stats = build_and_save_ml_datasets(
        surface_common=surface_common,
        thetao_common=thetao_common,
        output_dir=cfg.processed_dir,
        train_end_year=cfg.train_end_year,
        val_year=cfg.val_year,
        test_year=cfg.test_year,
    )

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
        "--config",
        type=str,
        default=None,
        help="Path to YAML configuration file (default: configs/prototype.yaml)",
    )
    parser.add_argument(
        "--raw-dir",
        type=str,
        default=None,
        help="Directory containing raw NetCDF data (default: data/raw)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory to save processed datasets (default: data/processed)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of Dask worker threads (default: 4)",
    )
    parser.add_argument(
        "--skip-qc-report",
        action="store_true",
        help="Skip computing and writing the QC CSV report",
    )

    args = parser.parse_args()

    run_pipeline(
        config_path=args.config,
        raw_dir=args.raw_dir,
        processed_dir=args.output_dir,
        workers=args.workers,
        skip_qc_report=args.skip_qc_report,
    )


if __name__ == "__main__":
    main()
