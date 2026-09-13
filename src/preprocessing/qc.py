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
    Supports both Level-4 gap-free variables and Level-3 legacy variables.
    """
    # 1. SST: Support analysed_sst (L4) or sea_surface_temperature (L3)
    sst_var = "analysed_sst" if "analysed_sst" in datasets["sst"] else "sea_surface_temperature"
    sst_raw = datasets["sst"][sst_var]
    sst_c = sst_raw - 273.15
    sst_qc = sst_c.where(np.isfinite(sst_c) & (sst_c >= -2.0) & (sst_c <= 40.0))
    sst_qc.attrs["units"] = "degrees_C"
    sst_qc.attrs["long_name"] = "Sea surface temperature"

    # 2. SSH and Currents
    ssh_raw = datasets["ssh"]["sla"]
    ssh_qc = ssh_raw.where(np.isfinite(ssh_raw) & (ssh_raw >= -5.0) & (ssh_raw <= 5.0))
    ssh_qc.attrs["units"] = "m"

    current_u_raw = datasets["currents"]["uo"]
    current_v_raw = datasets["currents"]["vo"]
    current_u_qc = current_u_raw.where(np.isfinite(current_u_raw) & (current_u_raw >= -5.0) & (current_u_raw <= 5.0))
    current_v_qc = current_v_raw.where(np.isfinite(current_v_raw) & (current_v_raw >= -5.0) & (current_v_raw <= 5.0))
    current_u_qc.attrs["units"] = "m/s"
    current_v_qc.attrs["units"] = "m/s"

    # 3. Winds: Handle hourly or daily data
    wind_u_raw = datasets["winds"]["eastward_wind"]
    wind_v_raw = datasets["winds"]["northward_wind"]
    if len(wind_u_raw.time) > 2500:
        print("Resampling hourly winds to daily mean...")
        wind_u_raw = wind_u_raw.resample(time="1D").mean().chunk({"time": 90, "latitude": -1, "longitude": -1})
        wind_v_raw = wind_v_raw.resample(time="1D").mean().chunk({"time": 90, "latitude": -1, "longitude": -1})

    wind_u_qc = wind_u_raw.where(np.isfinite(wind_u_raw) & (wind_u_raw >= -50.0) & (wind_u_raw <= 50.0))
    wind_v_qc = wind_v_raw.where(np.isfinite(wind_v_raw) & (wind_v_raw >= -50.0) & (wind_v_raw <= 50.0))
    wind_u_qc.attrs["units"] = "m/s"
    wind_v_qc.attrs["units"] = "m/s"

    # 4. GLORYS subsurface temperature
    thetao_raw = datasets["glorys"]["thetao"]
    thetao_qc = thetao_raw.where(np.isfinite(thetao_raw) & (thetao_raw >= -2.0) & (thetao_raw <= 40.0))
    thetao_qc.attrs["units"] = "degrees_C"

    # 5. SSS: Support unified Level-4 'sos' or legacy ascending/descending passes
    qc_dict = {
        "sst": sst_qc,
        "ssh": ssh_qc,
        "current_u": current_u_qc,
        "current_v": current_v_qc,
        "wind_u": wind_u_qc,
        "wind_v": wind_v_qc,
        "glorys": thetao_qc,
    }

    report_vars = [
        ("SST", sst_raw, sst_qc),
        ("SSH", ssh_raw, ssh_qc),
        ("Current U", current_u_raw, current_u_qc),
        ("Current V", current_v_raw, current_v_qc),
        ("Wind U", wind_u_raw, wind_u_qc),
        ("Wind V", wind_v_raw, wind_v_qc),
        ("GLORYS thetao", thetao_raw, thetao_qc),
    ]

    if "sss" in datasets:
        sss_var = "sos" if "sos" in datasets["sss"] else "Sea_Surface_Salinity"
        sss_raw = datasets["sss"][sss_var]
        if "depth" in sss_raw.dims:
            sss_raw = sss_raw.squeeze("depth", drop=True)
        sss_qc = sss_raw.where(np.isfinite(sss_raw) & (sss_raw >= 0.0) & (sss_raw <= 38.0))
        sss_qc.attrs["units"] = "0.001"
        qc_dict["sss"] = sss_qc
        report_vars.insert(1, ("SSS (Unified)", sss_raw, sss_qc))
    else:
        sss_asc_raw = datasets["sss_asc"]["Sea_Surface_Salinity"]
        sss_desc_raw = datasets["sss_desc"]["Sea_Surface_Salinity"]
        sss_asc_qc = sss_asc_raw.where(np.isfinite(sss_asc_raw) & (sss_asc_raw >= 0.0) & (sss_asc_raw <= 38.0))
        sss_desc_qc = sss_desc_raw.where(np.isfinite(sss_desc_raw) & (sss_desc_raw >= 0.0) & (sss_desc_raw <= 38.0))
        sss_asc_qc.attrs["units"] = "0.001"
        sss_desc_qc.attrs["units"] = "0.001"
        qc_dict["sss_asc"] = sss_asc_qc
        qc_dict["sss_desc"] = sss_desc_qc
        report_vars.insert(1, ("SSS Ascending", sss_asc_raw, sss_asc_qc))
        report_vars.insert(2, ("SSS Descending", sss_desc_raw, sss_desc_qc))

    if export_report:
        output_dir.mkdir(parents=True, exist_ok=True)
        qc_report_path = output_dir / "qc_report.csv"
        _compute_and_export_qc_report(qc_report_path, report_vars)

    return qc_dict


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
