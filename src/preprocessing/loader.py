"""Data loader for ANTARBODH raw oceanographic datasets with optimized chunking."""

from pathlib import Path
from typing import Dict, Optional, Tuple
import xarray as xr


def find_raw_file(directory: Path, pattern: str) -> Optional[Path]:
    """Find matching raw NetCDF file in directory, picking largest file if multiple exist."""
    candidates = list(directory.glob(pattern))
    if not candidates:
        return None
    candidates.sort(key=lambda p: p.stat().st_size, reverse=True)
    return candidates[0]


def load_raw_datasets(raw_dir: Path) -> Dict[str, xr.Dataset]:
    """
    Load raw oceanographic datasets with tuned Dask chunks.
    Supports both Level-4 unified products and legacy Level-3 swath datasets.
    """
    glorys_path = find_raw_file(raw_dir / "glorys", "glorys_bob*.nc")
    sst_path = find_raw_file(raw_dir / "sst", "sst_bob*.nc")
    ssh_path = find_raw_file(raw_dir / "ssh", "ssh_bob*.nc")
    currents_path = find_raw_file(raw_dir / "currents", "currents_bob*.nc")
    winds_path = find_raw_file(raw_dir / "winds", "winds_bob*.nc")

    if not glorys_path:
        raise FileNotFoundError(f"GLORYS data not found in {raw_dir / 'glorys'}")
    if not sst_path:
        raise FileNotFoundError(f"SST data not found in {raw_dir / 'sst'}")
    if not ssh_path:
        raise FileNotFoundError(f"SSH data not found in {raw_dir / 'ssh'}")
    if not currents_path:
        raise FileNotFoundError(f"Currents data not found in {raw_dir / 'currents'}")
    if not winds_path:
        raise FileNotFoundError(f"Winds data not found in {raw_dir / 'winds'}")

    print(f"Loading GLORYS from:  {glorys_path.name}")
    print(f"Loading SST from:     {sst_path.name}")
    print(f"Loading SSH from:     {ssh_path.name}")
    print(f"Loading Currents:     {currents_path.name}")
    print(f"Loading Winds from:   {winds_path.name}")

    glorys = xr.open_dataset(
        glorys_path,
        chunks={"time": 30, "depth": -1, "latitude": 60, "longitude": 80},
    )

    surface_chunks = {"time": 90, "latitude": -1, "longitude": -1}

    sst = xr.open_dataset(sst_path, chunks=surface_chunks)
    ssh = xr.open_dataset(ssh_path, chunks=surface_chunks)
    currents = xr.open_dataset(currents_path, chunks=surface_chunks)

    # Check if winds dataset is hourly (>2500 steps)
    ds_winds_meta = xr.open_dataset(winds_path)
    is_hourly_winds = len(ds_winds_meta.time) > 2500
    ds_winds_meta.close()
    wind_chunks = {"time": 720, "latitude": -1, "longitude": -1} if is_hourly_winds else surface_chunks
    winds = xr.open_dataset(winds_path, chunks=wind_chunks)

    datasets = {
        "glorys": glorys,
        "sst": sst,
        "ssh": ssh,
        "currents": currents,
        "winds": winds,
    }

    # SSS handling: Prioritize unified Level-4 SSS file, else fall back to legacy ascending/descending
    sss_unified_path = find_raw_file(raw_dir / "sss", "sss_bob.nc") or find_raw_file(raw_dir / "sss", "sss_bob_(*.nc")
    sss_asc_path = find_raw_file(raw_dir / "sss", "*ascending*.nc")
    sss_desc_path = find_raw_file(raw_dir / "sss", "*descending*.nc")

    if sss_unified_path:
        print(f"Loading Unified SSS:  {sss_unified_path.name}")
        datasets["sss"] = xr.open_dataset(sss_unified_path, chunks=surface_chunks)
    elif sss_asc_path and sss_desc_path:
        print(f"Loading SSS Asc from: {sss_asc_path.name}")
        print(f"Loading SSS Des from: {sss_desc_path.name}")
        datasets["sss_asc"] = xr.open_dataset(sss_asc_path, chunks=surface_chunks)
        datasets["sss_desc"] = xr.open_dataset(sss_desc_path, chunks=surface_chunks)
    else:
        raise FileNotFoundError(f"No SSS datasets found in {raw_dir / 'sss'}")

    return datasets
