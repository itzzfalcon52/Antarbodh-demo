"""Download daily Level-4 gap-free SSS for ANTARBODH (Multi-Observation Salinity).

Run from the repository root:
    .venv/bin/python src/download/sss.py
"""

import sys
import subprocess
from pathlib import Path
import xarray as xr
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from common import load_config, project_window, run_subset


def main():
    cfg = load_config()
    c = cfg["data_sources"]["sss"]

    start, end, min_lon, max_lon, min_lat, max_lat = project_window(cfg)

    # CMEMS Multi-Year (MY) ends in mid-December 2024 (e.g. 2024-12-15).
    # To get coverage for 2025 (Test set), we must append the Near-Real-Time (NRT) product.
    
    my_product_id = "cmems_obs-mob_glo_phy-sss_my_multi_P1D"
    nrt_product_id = "cmems_obs-mob_glo_phy-sss_nrt_multi_P1D"
    variable = c["expected_variable"]
    
    outdir = Path(c["directory"])
    if not outdir.is_absolute():
        outdir = Path(__file__).resolve().parent.parent.parent / outdir
    outdir.mkdir(parents=True, exist_ok=True)
    
    # 1. Download MY Data
    print(f"Downloading Level-4 SSS (MY: {my_product_id}) from {start} to 2024-12-15...")
    my_filename = "sss_my_temp.nc"
    try:
        run_subset(
            dataset_id=my_product_id,
            variables=[variable],
            start_datetime=start,
            end_datetime="2024-12-15 23:59:59",
            minimum_longitude=min_lon,
            maximum_longitude=max_lon,
            minimum_latitude=min_lat,
            maximum_latitude=max_lat,
            output_directory=str(outdir),
            output_filename=my_filename,
        )
    except subprocess.CalledProcessError as e:
        print(f"Warning: Failed to download MY SSS (maybe already downloaded or server error). Error: {e}")

    # 2. Download NRT Data for the rest of the period
    print(f"Downloading Level-4 SSS (NRT: {nrt_product_id}) from 2024-12-16 to {end}...")
    nrt_filename = "sss_nrt_temp.nc"
    try:
        run_subset(
            dataset_id=nrt_product_id,
            variables=[variable],
            start_datetime="2024-12-16 00:00:00",
            end_datetime=end,
            minimum_longitude=min_lon,
            maximum_longitude=max_lon,
            minimum_latitude=min_lat,
            maximum_latitude=max_lat,
            output_directory=str(outdir),
            output_filename=nrt_filename,
        )
    except subprocess.CalledProcessError as e:
        print(f"Warning: Failed to download NRT SSS. Error: {e}")

    # 3. Merge MY and NRT Datasets
    my_file = outdir / my_filename
    nrt_file = outdir / nrt_filename
    # Avoid overwriting sss_bob.nc while pipeline is running
    final_file = outdir / "sss_bob_full.nc"

    print(f"Merging MY and NRT datasets into {final_file}...")
    
    datasets_to_merge = []
    if my_file.exists():
        datasets_to_merge.append(xr.open_dataset(my_file))
    else:
        print(f"Warning: MY dataset file {my_file} not found.")
        
    if nrt_file.exists():
        datasets_to_merge.append(xr.open_dataset(nrt_file))
    else:
        print(f"Warning: NRT dataset file {nrt_file} not found.")

    if not datasets_to_merge:
        print("Error: No SSS datasets were downloaded.")
        sys.exit(1)

    if len(datasets_to_merge) == 1:
        merged = datasets_to_merge[0]
    else:
        merged = xr.concat(datasets_to_merge, dim="time")
        # Ensure it is sorted by time and drop any duplicates
        merged = merged.drop_duplicates(dim="time", keep="first")
        merged = merged.sortby("time")

    # Save final dataset
    merged.to_netcdf(final_file)
    print("Done!")

    # Cleanup temp files
    for d in datasets_to_merge:
        d.close()
        
    if my_file.exists():
        my_file.unlink()
    if nrt_file.exists():
        nrt_file.unlink()

if __name__ == "__main__":
    main()
