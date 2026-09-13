"""Data loader for ANTARBODH raw oceanographic datasets with optimized chunking."""

from pathlib import Path
from typing import Dict, Optional, Tuple
import xarray as xr


def find_raw_file(directory: Path, pattern: str) -> Path:
    """Find the best matching raw NetCDF file in directory, picking the largest file if multiple exist."""
    candidates = list(directory.glob(pattern))
    if not candidates:
        raise FileNotFoundError(
            f"No raw files found in {directory} matching pattern '{pattern}'. "
            f"Please ensure raw data is downloaded."
        )
    # Sort by size descending so full/complete downloads are prioritized over fragments
    candidates.sort(key=lambda p: p.stat().st_size, reverse=True)
    return candidates[0]


def load_raw_datasets(raw_dir: Path) -> Dict[str, xr.Dataset]:
    """
    Load all 7 raw oceanographic datasets with tuned Dask chunks.

    Returns:
        dict: Mapping of dataset keys:
            - 'glorys': 3D subsurface temperature
            - 'sst': Sea surface temperature
            - 'sss_asc': Sea surface salinity ascending pass
            - 'sss_desc': Sea surface salinity descending pass
            - 'ssh': Sea level anomaly
            - 'currents': Surface eastward and northward current velocities
            - 'winds': Eastward and northward wind velocities
    """
    glorys_path = find_raw_file(raw_dir / "glorys", "glorys_bob*.nc")
    sst_path = find_raw_file(raw_dir / "sst", "sst_bob*.nc")
    sss_asc_path = find_raw_file(raw_dir / "sss", "*ascending*.nc")
    sss_desc_path = find_raw_file(raw_dir / "sss", "*descending*.nc")
    ssh_path = find_raw_file(raw_dir / "ssh", "ssh_bob*.nc")
    currents_path = find_raw_file(raw_dir / "currents", "currents_bob*.nc")
    winds_path = find_raw_file(raw_dir / "winds", "winds_bob*.nc")

    print(f"Loading GLORYS from:  {glorys_path.name}")
    print(f"Loading SST from:     {sst_path.name}")
    print(f"Loading SSS Asc from: {sss_asc_path.name}")
    print(f"Loading SSS Des from: {sss_desc_path.name}")
    print(f"Loading SSH from:     {ssh_path.name}")
    print(f"Loading Currents:     {currents_path.name}")
    print(f"Loading Winds from:   {winds_path.name}")

    # Chunk topology optimized to minimize Dask task graph overhead
    glorys = xr.open_dataset(
        glorys_path,
        chunks={"time": 30, "depth": -1, "latitude": 60, "longitude": 80},
    )

    surface_chunks = {"time": 90, "latitude": -1, "longitude": -1}

    sst = xr.open_dataset(sst_path, chunks=surface_chunks)
    sss_asc = xr.open_dataset(sss_asc_path, chunks=surface_chunks)
    sss_desc = xr.open_dataset(sss_desc_path, chunks=surface_chunks)
    ssh = xr.open_dataset(ssh_path, chunks=surface_chunks)
    currents = xr.open_dataset(currents_path, chunks=surface_chunks)
    winds = xr.open_dataset(winds_path, chunks=surface_chunks)

    return {
        "glorys": glorys,
        "sst": sst,
        "sss_asc": sss_asc,
        "sss_desc": sss_desc,
        "ssh": ssh,
        "currents": currents,
        "winds": winds,
    }
