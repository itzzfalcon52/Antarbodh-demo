"""Data loader for ANTARBODH raw oceanographic datasets.

Selects source files EXPLICITLY from configuration — no file-size-based sorting.
Validates expected variables exist after opening each dataset.
"""

from pathlib import Path
from typing import Dict
import xarray as xr

from src.preprocessing.config import PreprocessingConfig, SourceFile


def _resolve_source(cfg: PreprocessingConfig, key: str) -> Path:
    """Resolve the absolute path for a configured data source."""
    if key not in cfg.source_files:
        raise KeyError(f"No source file configured for '{key}' in data_sources")

    spec: SourceFile = cfg.source_files[key]
    path = cfg.project_root / spec.directory / spec.filename

    if not path.exists():
        raise FileNotFoundError(
            f"{key} source file not found: {path}\n"
            f"  Expected: {spec.filename} in {spec.directory}"
        )
    return path


def _validate_variables(ds: xr.Dataset, name: str, expected: list) -> None:
    """Assert that all expected variables exist in the dataset."""
    for var in expected:
        if var not in ds.data_vars:
            available = list(ds.data_vars)
            raise ValueError(
                f"{name}: expected variable '{var}' not found.\n"
                f"  Available variables: {available}"
            )


def _check_source_covers_grid(
    ds: xr.Dataset,
    name: str,
    target_lat_min: float,
    target_lat_max: float,
    target_lon_min: float,
    target_lon_max: float,
) -> None:
    """Verify source coordinates bracket the target grid (no extrapolation)."""
    if "latitude" in ds.coords:
        src_lat = ds.latitude.values
        if src_lat.min() > target_lat_min or src_lat.max() < target_lat_max:
            raise ValueError(
                f"{name}: source latitude [{src_lat.min():.4f}, {src_lat.max():.4f}] "
                f"does not cover target [{target_lat_min:.4f}, {target_lat_max:.4f}]. "
                f"Interpolation would require extrapolation."
            )
    if "longitude" in ds.coords:
        src_lon = ds.longitude.values
        if src_lon.min() > target_lon_min or src_lon.max() < target_lon_max:
            raise ValueError(
                f"{name}: source longitude [{src_lon.min():.4f}, {src_lon.max():.4f}] "
                f"does not cover target [{target_lon_min:.4f}, {target_lon_max:.4f}]. "
                f"Interpolation would require extrapolation."
            )


def load_raw_datasets(cfg: PreprocessingConfig) -> Dict[str, xr.Dataset]:
    """
    Load raw oceanographic datasets with explicit file selection and variable validation.

    Returns a dictionary with keys: glorys, sst, ssh, currents, winds, sss (or sss_asc/sss_desc).
    """
    surface_chunks = {"time": 90, "latitude": -1, "longitude": -1}

    # Target grid bounds (cell centers) for extrapolation check
    res = cfg.grid_resolution
    tgt_lat_min = cfg.min_lat + res / 2.0
    tgt_lat_max = cfg.max_lat - res / 2.0
    tgt_lon_min = cfg.min_lon + res / 2.0
    tgt_lon_max = cfg.max_lon - res / 2.0

    datasets: Dict[str, xr.Dataset] = {}

    # ── GLORYS ────────────────────────────────────────────────────────────
    glorys_path = _resolve_source(cfg, "glorys")
    glorys = xr.open_dataset(
        glorys_path,
        chunks={"time": 30, "depth": -1, "latitude": -1, "longitude": -1},
    )
    _validate_variables(glorys, "GLORYS", ["thetao"])
    _check_source_covers_grid(glorys, "GLORYS", tgt_lat_min, tgt_lat_max, tgt_lon_min, tgt_lon_max)

    # Validate dimensions
    assert "time" in glorys.dims, "GLORYS missing 'time' dimension"
    assert "depth" in glorys.dims, "GLORYS missing 'depth' dimension"
    assert "latitude" in glorys.dims, "GLORYS missing 'latitude' dimension"
    assert "longitude" in glorys.dims, "GLORYS missing 'longitude' dimension"

    glorys_spec = cfg.source_files["glorys"]
    print(f"GLORYS loaded:    {glorys_path.name}  [{glorys_spec.product_level}]  var=thetao")
    print(f"  dims: {dict(glorys.sizes)}")
    print(f"  depth range: {float(glorys.depth.values[0]):.3f} → {float(glorys.depth.values[-1]):.3f} m")
    datasets["glorys"] = glorys

    # ── SST ───────────────────────────────────────────────────────────────
    sst_path = _resolve_source(cfg, "sst")
    sst = xr.open_dataset(sst_path, chunks=surface_chunks)
    sst_spec = cfg.source_files["sst"]
    _validate_variables(sst, "SST", [sst_spec.expected_variable])
    _check_source_covers_grid(sst, "SST", tgt_lat_min, tgt_lat_max, tgt_lon_min, tgt_lon_max)
    print(f"SST loaded:       {sst_path.name}  [{sst_spec.product_level}]  var={sst_spec.expected_variable}")
    print(f"  units: {sst[sst_spec.expected_variable].attrs.get('units', 'N/A')}")
    if sst_spec.units_conversion == "kelvin_to_celsius":
        print(f"  conversion: Kelvin → Celsius will be applied")
    datasets["sst"] = sst

    # ── SSH ───────────────────────────────────────────────────────────────
    ssh_path = _resolve_source(cfg, "ssh")
    ssh = xr.open_dataset(ssh_path, chunks=surface_chunks)
    ssh_spec = cfg.source_files["ssh"]
    _validate_variables(ssh, "SSH", [ssh_spec.expected_variable])
    _check_source_covers_grid(ssh, "SSH", tgt_lat_min, tgt_lat_max, tgt_lon_min, tgt_lon_max)
    print(f"SSH loaded:       {ssh_path.name}  [{ssh_spec.product_level}]  var={ssh_spec.expected_variable}")
    datasets["ssh"] = ssh

    # ── Currents ──────────────────────────────────────────────────────────
    currents_path = _resolve_source(cfg, "currents")
    currents = xr.open_dataset(currents_path, chunks=surface_chunks)
    curr_spec = cfg.source_files["currents"]
    _validate_variables(currents, "Currents", curr_spec.expected_variables)
    _check_source_covers_grid(currents, "Currents", tgt_lat_min, tgt_lat_max, tgt_lon_min, tgt_lon_max)

    # Explicit surface depth selection
    if "depth" in currents.dims:
        depth_vals = currents.depth.values
        selected_depth = float(currents.sel(depth=0, method="nearest").depth.values)
        print(f"Currents loaded:  {currents_path.name}  [{curr_spec.product_level}]  var=uo,vo")
        print(f"  depth dim present: {len(depth_vals)} level(s), selecting surface depth = {selected_depth:.2f} m")
        if selected_depth > 5.0:
            raise ValueError(
                f"Currents: selected depth {selected_depth:.2f} m is too deep for surface currents. "
                f"Available depths: {depth_vals}"
            )
        currents = currents.sel(depth=selected_depth, method="nearest").drop_vars("depth", errors="ignore")
    else:
        print(f"Currents loaded:  {currents_path.name}  [{curr_spec.product_level}]  var=uo,vo (no depth dim)")
    datasets["currents"] = currents

    # ── Winds ─────────────────────────────────────────────────────────────
    winds_path = _resolve_source(cfg, "winds")
    winds_spec = cfg.source_files["winds"]

    is_hourly = winds_spec.temporal_resolution == "hourly"

    wind_chunks = {"time": 720, "latitude": -1, "longitude": -1} if is_hourly else surface_chunks
    winds = xr.open_dataset(winds_path, chunks=wind_chunks)
    _validate_variables(winds, "Winds", winds_spec.expected_variables)
    _check_source_covers_grid(winds, "Winds", tgt_lat_min, tgt_lat_max, tgt_lon_min, tgt_lon_max)
    temporal_label = "hourly" if is_hourly else "daily"
    print(f"Winds loaded:     {winds_path.name}  [{winds_spec.product_level}]  var=eastward_wind,northward_wind")
    print(f"  temporal: {temporal_label}")
    datasets["winds"] = winds

    # ── SSS ───────────────────────────────────────────────────────────────
    sss_spec = cfg.source_files.get("sss")
    if sss_spec:
        sss_path = cfg.project_root / sss_spec.directory / sss_spec.filename
        if sss_path.exists() and sss_spec.expected_variable:
            sss = xr.open_dataset(sss_path, chunks=surface_chunks)
            _validate_variables(sss, "SSS (unified L4)", [sss_spec.expected_variable])
            _check_source_covers_grid(sss, "SSS", tgt_lat_min, tgt_lat_max, tgt_lon_min, tgt_lon_max)

            # Squeeze singleton depth if present
            if "depth" in sss.dims and sss.sizes["depth"] == 1:
                sss = sss.squeeze("depth", drop=True)
                print(f"SSS loaded:       {sss_path.name}  [{sss_spec.product_level}]  var={sss_spec.expected_variable}")
                print(f"  singleton depth squeezed")
            else:
                print(f"SSS loaded:       {sss_path.name}  [{sss_spec.product_level}]  var={sss_spec.expected_variable}")

            # Report temporal coverage
            sss_first = str(sss.time.values[0])[:10]
            sss_last = str(sss.time.values[-1])[:10]
            print(f"  temporal coverage: {sss_first} → {sss_last}")
            if sss_last < cfg.time_end:
                print(f"  ⚠ WARNING: SSS data ends {sss_last}, before configured end {cfg.time_end}")
                print(f"    SSS will be NaN (SSS_mask=0) for dates beyond coverage.")

            datasets["sss"] = sss

        elif sss_spec.legacy_ascending and sss_spec.legacy_descending:
            # Legacy ascending/descending SSS
            asc_path = cfg.project_root / sss_spec.directory / sss_spec.legacy_ascending
            desc_path = cfg.project_root / sss_spec.directory / sss_spec.legacy_descending
            if asc_path.exists() and desc_path.exists():
                sss_asc = xr.open_dataset(asc_path, chunks=surface_chunks)
                sss_desc = xr.open_dataset(desc_path, chunks=surface_chunks)
                leg_var = sss_spec.legacy_variable or "Sea_Surface_Salinity"
                _validate_variables(sss_asc, "SSS ascending", [leg_var])
                _validate_variables(sss_desc, "SSS descending", [leg_var])
                print(f"SSS Asc loaded:   {asc_path.name}  [legacy]  var={leg_var}")
                print(f"SSS Desc loaded:  {desc_path.name}  [legacy]  var={leg_var}")
                datasets["sss_asc"] = sss_asc
                datasets["sss_desc"] = sss_desc
            else:
                raise FileNotFoundError(f"SSS: neither unified nor legacy files found.")
        else:
            raise FileNotFoundError(f"SSS: unified file {sss_path} not found and no legacy fallback configured.")
    else:
        raise KeyError("No 'sss' entry in data_sources configuration.")

    print("")
    return datasets
