"""Quality control, physical-range validation, wind resampling, and coverage reporting.

QC thresholds are consumed from configuration — not hard-coded.
The SSS ≤ 38 bound is a dataset-specific anomaly filter, NOT a universal physical law.
"""

import csv
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import dask
import numpy as np
import xarray as xr

from src.preprocessing.config import PreprocessingConfig, QCThresholds


def _range_filter(da: xr.DataArray, vmin: float, vmax: float) -> xr.DataArray:
    """Apply finite-value check and physical-range filter. Out-of-range → NaN."""
    return da.where(np.isfinite(da) & (da >= vmin) & (da <= vmax))


def _resample_hourly_winds(
    wind_da: xr.DataArray,
    min_obs_per_day: int,
) -> xr.DataArray:
    """
    Resample hourly wind component to daily mean with coverage control.

    Days with fewer than `min_obs_per_day` valid hourly observations (per pixel)
    are set to NaN. This ensures incomplete daily wind coverage does not
    automatically become a valid daily observation.

    Args:
        wind_da: Hourly wind DataArray.
        min_obs_per_day: Minimum number of valid hourly obs required (e.g. 18 of 24).

    Returns:
        Daily mean DataArray with insufficient-coverage days masked to NaN.
    """
    resampler = wind_da.resample(time="1D")
    daily_mean = resampler.mean()
    daily_count = resampler.count()

    # Mask days with insufficient coverage
    daily_mean = daily_mean.where(daily_count >= min_obs_per_day)

    return daily_mean.chunk({"time": 90, "latitude": -1, "longitude": -1})


def apply_quality_control(
    datasets: Dict[str, xr.Dataset],
    cfg: PreprocessingConfig,
    output_dir: Path,
    export_report: bool = True,
) -> Dict[str, xr.DataArray]:
    """
    Apply configurable physical QC checks, unit conversions, and wind resampling.

    Returns dictionary of QC'd DataArrays ready for regridding.
    """
    qc = cfg.qc

    # ── SST ───────────────────────────────────────────────────────────────
    sst_spec = cfg.source_files["sst"]
    sst_var = sst_spec.expected_variable
    sst_raw = datasets["sst"][sst_var]

    if sst_spec.units_conversion == "kelvin_to_celsius":
        sst_c = sst_raw - 273.15
        print(f"SST: converted from Kelvin to Celsius (source units: {sst_raw.attrs.get('units', 'N/A')})")
    else:
        sst_c = sst_raw

    sst_qc = _range_filter(sst_c, qc.sst_min, qc.sst_max)
    sst_qc.attrs["units"] = "degrees_C"
    sst_qc.attrs["long_name"] = "Sea surface temperature"
    sst_qc.attrs["qc_bounds"] = f"[{qc.sst_min}, {qc.sst_max}] degrees_C"

    # ── SSH ───────────────────────────────────────────────────────────────
    ssh_spec = cfg.source_files["ssh"]
    ssh_raw = datasets["ssh"][ssh_spec.expected_variable]
    ssh_qc = _range_filter(ssh_raw, qc.ssh_min, qc.ssh_max)
    ssh_qc.attrs["units"] = "m"
    ssh_qc.attrs["long_name"] = "Sea surface height anomaly"
    ssh_qc.attrs["qc_bounds"] = f"[{qc.ssh_min}, {qc.ssh_max}] m"

    # ── Currents (surface depth already selected in loader) ──────────────
    current_u_raw = datasets["currents"]["uo"]
    current_v_raw = datasets["currents"]["vo"]
    current_u_qc = _range_filter(current_u_raw, qc.current_min, qc.current_max)
    current_v_qc = _range_filter(current_v_raw, qc.current_min, qc.current_max)
    current_u_qc.attrs["units"] = "m/s"
    current_v_qc.attrs["units"] = "m/s"
    current_u_qc.attrs["qc_bounds"] = f"[{qc.current_min}, {qc.current_max}] m/s"
    current_v_qc.attrs["qc_bounds"] = f"[{qc.current_min}, {qc.current_max}] m/s"

    # ── Winds ─────────────────────────────────────────────────────────────
    wind_u_raw = datasets["winds"]["eastward_wind"]
    wind_v_raw = datasets["winds"]["northward_wind"]

    is_hourly = cfg.source_files["winds"].temporal_resolution == "hourly"
    if is_hourly:
        min_obs = cfg.wind_min_hourly_obs_per_day
        print(f"Resampling hourly winds to daily mean (min coverage: {min_obs}/24 hours per pixel)...")
        wind_u_daily = _resample_hourly_winds(wind_u_raw, min_obs)
        wind_v_daily = _resample_hourly_winds(wind_v_raw, min_obs)
    else:
        wind_u_daily = wind_u_raw
        wind_v_daily = wind_v_raw

    wind_u_qc = _range_filter(wind_u_daily, qc.wind_min, qc.wind_max)
    wind_v_qc = _range_filter(wind_v_daily, qc.wind_min, qc.wind_max)
    wind_u_qc.attrs["units"] = "m/s"
    wind_v_qc.attrs["units"] = "m/s"
    wind_u_qc.attrs["qc_bounds"] = f"[{qc.wind_min}, {qc.wind_max}] m/s"
    wind_v_qc.attrs["qc_bounds"] = f"[{qc.wind_min}, {qc.wind_max}] m/s"

    # ── GLORYS ────────────────────────────────────────────────────────────
    thetao_raw = datasets["glorys"]["thetao"]
    thetao_qc = _range_filter(thetao_raw, qc.thetao_min, qc.thetao_max)
    thetao_qc.attrs["units"] = "degrees_C"
    thetao_qc.attrs["long_name"] = "Sea water potential temperature"
    thetao_qc.attrs["qc_bounds"] = f"[{qc.thetao_min}, {qc.thetao_max}] degrees_C"

    # ── SSS ───────────────────────────────────────────────────────────────
    qc_dict: Dict[str, xr.DataArray] = {
        "sst": sst_qc,
        "ssh": ssh_qc,
        "current_u": current_u_qc,
        "current_v": current_v_qc,
        "wind_u": wind_u_qc,
        "wind_v": wind_v_qc,
        "glorys": thetao_qc,
    }

    report_vars: List[Tuple[str, xr.DataArray, xr.DataArray]] = [
        ("SST", sst_raw, sst_qc),
        ("SSH", ssh_raw, ssh_qc),
        ("Current U", current_u_raw, current_u_qc),
        ("Current V", current_v_raw, current_v_qc),
        ("Wind U", wind_u_daily if is_hourly else wind_u_raw, wind_u_qc),
        ("Wind V", wind_v_daily if is_hourly else wind_v_raw, wind_v_qc),
        ("GLORYS thetao", thetao_raw, thetao_qc),
    ]

    if "sss" in datasets:
        sss_spec = cfg.source_files["sss"]
        sss_var = sss_spec.expected_variable
        sss_raw = datasets["sss"][sss_var]

        sss_qc = _range_filter(sss_raw, qc.sss_min, qc.sss_max)
        # SSS units: source uses "0.001" (PSU). Preserve numeric convention.
        source_units = sss_raw.attrs.get("units", "N/A")
        sss_qc.attrs["units"] = "PSU"
        sss_qc.attrs["source_units"] = source_units
        sss_qc.attrs["long_name"] = "Sea surface salinity"
        sss_qc.attrs["qc_bounds"] = (
            f"[{qc.sss_min}, {qc.sss_max}] PSU — dataset-specific anomaly filter, "
            f"NOT a universal physical oceanographic law"
        )
        qc_dict["sss"] = sss_qc
        report_vars.insert(1, ("SSS (L4 unified)", sss_raw, sss_qc))
    else:
        # Legacy ascending/descending SSS
        sss_spec = cfg.source_files["sss"]
        leg_var = sss_spec.legacy_variable or "Sea_Surface_Salinity"
        sss_asc_raw = datasets["sss_asc"][leg_var]
        sss_desc_raw = datasets["sss_desc"][leg_var]
        sss_asc_qc = _range_filter(sss_asc_raw, qc.sss_min, qc.sss_max)
        sss_desc_qc = _range_filter(sss_desc_raw, qc.sss_min, qc.sss_max)
        sss_asc_qc.attrs["units"] = "PSU"
        sss_desc_qc.attrs["units"] = "PSU"
        qc_dict["sss_asc"] = sss_asc_qc
        qc_dict["sss_desc"] = sss_desc_qc
        report_vars.insert(1, ("SSS Ascending", sss_asc_raw, sss_asc_qc))
        report_vars.insert(2, ("SSS Descending", sss_desc_raw, sss_desc_qc))

    if export_report:
        output_dir.mkdir(parents=True, exist_ok=True)
        qc_report_path = output_dir / "qc_report.csv"
        _compute_and_export_qc_report(qc_report_path, report_vars, thetao_qc)

    return qc_dict


def _compute_and_export_qc_report(
    path: Path,
    variables: List[Tuple[str, xr.DataArray, xr.DataArray]],
    thetao_qc: xr.DataArray,
) -> None:
    """
    Compute QC retention, ocean-only coverage, and joint 7-variable coverage.

    Ocean mask is derived from GLORYS thetao: any grid cell that has a valid
    temperature observation at any time and any depth is considered ocean.
    """
    print("Computing QC coverage statistics (batched)...")

    # ── Ocean mask from GLORYS (surface level, any time valid) ────────────
    # Select shallowest depth level to determine ocean vs land in 2D
    glorys_surface = thetao_qc.isel(depth=0)
    ocean_mask_2d = glorys_surface.notnull().any(dim="time")

    # ── Individual variable stats ─────────────────────────────────────────
    valid_counts = [qc_da.notnull().sum() for _, _, qc_da in variables]
    ocean_valid_counts = [(qc_da.notnull() & ocean_mask_2d).sum() for _, _, qc_da in variables]

    ocean_cells_lazy = ocean_mask_2d.sum()
    all_lazy = valid_counts + ocean_valid_counts + [ocean_mask_2d, ocean_cells_lazy]
    computed = dask.compute(*all_lazy)

    n_vars = len(variables)
    valid_results = computed[:n_vars]
    ocean_valid_results = computed[n_vars:2*n_vars]
    ocean_mask_2d_computed = computed[-2]  # (lat, lon) boolean
    ocean_cells_computed = computed[-1]

    ocean_cells = int(ocean_cells_computed.item())
    total_spatial = int(ocean_mask_2d_computed.size)
    land_cells = total_spatial - ocean_cells

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Dataset", "Total Grid Points", "Valid After QC",
            "Rejected", "Overall Retention %", "Ocean-only Retention %", "Ocean Cells (spatial)", "Ocean Coverage Note"
        ])

        print("\n" + "=" * 75)
        print("ANTARBODH QUALITY CONTROL AUDIT")
        print("=" * 75)
        print(f"Spatial grid: {total_spatial} cells ({ocean_cells} ocean, {land_cells} land)")
        print("-" * 75)

        for i, (name, raw_da, _) in enumerate(variables):
            total = int(raw_da.size)
            valid = int(valid_results[i].item())
            ocean_valid = int(ocean_valid_results[i].item())
            ocean_total = ocean_cells * raw_da.sizes.get("time", 1)
            
            rejected = total - valid
            ret_pct = (valid / total) * 100 if total > 0 else 0.0
            ocean_ret_pct = (ocean_valid / ocean_total) * 100 if ocean_total > 0 else 0.0

            writer.writerow([
                name, total, valid, rejected,
                round(ret_pct, 4), round(ocean_ret_pct, 4), ocean_cells,
                f"Ocean mask: {ocean_cells}/{total_spatial} spatial cells"
            ])
            print(f"{name:20s} | Overall Ret: {ret_pct:6.2f}% | Ocean Ret: {ocean_ret_pct:6.2f}% | Rej: {rejected:,}/{total:,}")

    print(f"\n✓ QC audit saved to {path}\n")
