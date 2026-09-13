"""Quality control, physical bounds validation, and unit standardization."""

import csv
from pathlib import Path
from typing import Dict, Tuple
import dask
import numpy as np
import xarray as xr


def apply_quality_control(
    datasets: Dict[str, xr.Dataset],
    output_dir: Path,
    export_report: bool = True,
) -> Dict[str, xr.DataArray]:
    """
    Apply physical quality control checks, range filters, and unit conversions.

    Args:
        datasets: Dict of raw xarray Datasets.
        output_dir: Path to directory where qc_report.csv will be saved.
        export_report: Whether to compute and export QC retention audit.

    Returns:
        Dict of standardized xr.DataArrays:
            - sst_c: SST in Celsius (physical limits -2 to 40 °C)
            - sss_asc_qc: Salinity ascending (0 to 38 psu)
            - sss_desc_qc: Salinity descending (0 to 38 psu)
            - ssh_qc: SSH sea level anomaly (-5 to 5 m)
            - current_u_qc: Eastward current velocity (-5 to 5 m/s)
            - current_v_qc: Northward current velocity (-5 to 5 m/s)
            - wind_u_qc: Eastward wind velocity (-50 to 50 m/s)
            - wind_v_qc: Northward wind velocity (-50 to 50 m/s)
            - thetao_qc: GLORYS subsurface temperature (-2 to 40 °C)
    """
    sst_raw = datasets["sst"]["sea_surface_temperature"]
    sss_asc_raw = datasets["sss_asc"]["Sea_Surface_Salinity"]
    sss_desc_raw = datasets["sss_desc"]["Sea_Surface_Salinity"]
    ssh_raw = datasets["ssh"]["sla"]
    current_u_raw = datasets["currents"]["uo"]
    current_v_raw = datasets["currents"]["vo"]
    wind_u_raw = datasets["winds"]["eastward_wind"]
    wind_v_raw = datasets["winds"]["northward_wind"]
    thetao_raw = datasets["glorys"]["thetao"]

    # 1. Finite mask and physical domain ranges
    # Convert SST from Kelvin to Celsius
    sst_c = sst_raw - 273.15
    sst_qc = sst_c.where(np.isfinite(sst_c) & (sst_c >= -2.0) & (sst_c <= 40.0))

    # SSS practical salinity limits
    sss_asc_qc = sss_asc_raw.where(np.isfinite(sss_asc_raw) & (sss_asc_raw >= 0.0) & (sss_asc_raw <= 38.0))
    sss_desc_qc = sss_desc_raw.where(np.isfinite(sss_desc_raw) & (sss_desc_raw >= 0.0) & (sss_desc_raw <= 38.0))

    # Dynamic and velocity limits
    ssh_qc = ssh_raw.where(np.isfinite(ssh_raw) & (ssh_raw >= -5.0) & (ssh_raw <= 5.0))
    current_u_qc = current_u_raw.where(np.isfinite(current_u_raw) & (current_u_raw >= -5.0) & (current_u_raw <= 5.0))
    current_v_qc = current_v_raw.where(np.isfinite(current_v_raw) & (current_v_raw >= -5.0) & (current_v_raw <= 5.0))
    wind_u_qc = wind_u_raw.where(np.isfinite(wind_u_raw) & (wind_u_raw >= -50.0) & (wind_u_raw <= 50.0))
    wind_v_qc = wind_v_raw.where(np.isfinite(wind_v_raw) & (wind_v_raw >= -50.0) & (wind_v_raw <= 50.0))

    # GLORYS temperature limits
    thetao_qc = thetao_raw.where(np.isfinite(thetao_raw) & (thetao_raw >= -2.0) & (thetao_raw <= 40.0))

    # Standardize metadata attributes
    sst_qc.attrs["units"] = "degrees_C"
    sst_qc.attrs["long_name"] = "Sea surface temperature"
    sss_asc_qc.attrs["units"] = "0.001"
    sss_desc_qc.attrs["units"] = "0.001"
    ssh_qc.attrs["units"] = "m"
    current_u_qc.attrs["units"] = "m/s"
    current_v_qc.attrs["units"] = "m/s"
    wind_u_qc.attrs["units"] = "m/s"
    wind_v_qc.attrs["units"] = "m/s"
    thetao_qc.attrs["units"] = "degrees_C"

    if export_report:
        output_dir.mkdir(parents=True, exist_ok=True)
        qc_report_path = output_dir / "qc_report.csv"
        _compute_and_export_qc_report(
            qc_report_path,
            [
                ("SST", sst_raw, sst_qc),
                ("SSS Ascending", sss_asc_raw, sss_asc_qc),
                ("SSS Descending", sss_desc_raw, sss_desc_qc),
                ("SSH", ssh_raw, ssh_qc),
                ("Current U", current_u_raw, current_u_qc),
                ("Current V", current_v_raw, current_v_qc),
                ("Wind U", wind_u_raw, wind_u_qc),
                ("Wind V", wind_v_raw, wind_v_qc),
                ("GLORYS thetao", thetao_raw, thetao_qc),
            ],
        )

    return {
        "sst": sst_qc,
        "sss_asc": sss_asc_qc,
        "sss_desc": sss_desc_qc,
        "ssh": ssh_qc,
        "current_u": current_u_qc,
        "current_v": current_v_qc,
        "wind_u": wind_u_qc,
        "wind_v": wind_v_qc,
        "glorys": thetao_qc,
    }


def _compute_and_export_qc_report(path: Path, variables):
    """Compute valid observation retention percentages in one batched Dask call and save CSV."""
    print("Computing QC retention statistics (batched)...")
    valid_counts = [qc_da.notnull().sum() for _, _, qc_da in variables]
    computed_counts = dask.compute(*valid_counts)

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Dataset", "Total Observations", "Valid After QC", "Rejected", "Rejection %", "Retention %"])

        print("\n" + "=" * 65)
        print("ANTARBODH QUALITY CONTROL AUDIT")
        print("=" * 65)

        for (name, raw_da, _), valid_result in zip(variables, computed_counts):
            total = int(raw_da.size)
            valid = int(valid_result.item())
            rejected = total - valid
            rej_pct = (rejected / total) * 100 if total > 0 else 0.0
            ret_pct = (valid / total) * 100 if total > 0 else 0.0

            writer.writerow([name, total, valid, rejected, round(rej_pct, 4), round(ret_pct, 4)])
            print(f"{name:16s} | Valid: {ret_pct:6.2f}% | Rejected: {rej_pct:5.2f}% ({rejected:,} of {total:,})")

    print(f"✓ QC audit saved to {path}\n")
