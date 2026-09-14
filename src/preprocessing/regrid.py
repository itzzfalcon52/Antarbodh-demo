"""Regridding, spatial harmonization, time alignment, and 3D vertical interpolation.

All interpolation uses method="linear" explicitly.
No extrapolation: kwargs={"fill_value": None} prevents xarray from filling outside
the source domain. Source coordinate range checks are performed before interpolation.
"""

from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
import xarray as xr

from src.preprocessing.config import PreprocessingConfig


def build_canonical_time_axis(cfg: PreprocessingConfig) -> pd.DatetimeIndex:
    """
    Build the canonical daily time axis from configuration.

    Returns:
        pd.DatetimeIndex with daily frequency from time_start to time_end.
    """
    return pd.date_range(start=cfg.time_start, end=cfg.time_end, freq="D")


def _verify_no_extrapolation(
    name: str,
    src_lat: np.ndarray,
    src_lon: np.ndarray,
    tgt_lat: np.ndarray,
    tgt_lon: np.ndarray,
) -> None:
    """Verify target grid is inside source coordinate range."""
    if tgt_lat.min() < src_lat.min() - 1e-6:
        raise ValueError(
            f"{name}: target lat min {tgt_lat.min():.4f} < source lat min {src_lat.min():.4f}"
        )
    if tgt_lat.max() > src_lat.max() + 1e-6:
        raise ValueError(
            f"{name}: target lat max {tgt_lat.max():.4f} > source lat max {src_lat.max():.4f}"
        )
    if tgt_lon.min() < src_lon.min() - 1e-6:
        raise ValueError(
            f"{name}: target lon min {tgt_lon.min():.4f} < source lon min {src_lon.min():.4f}"
        )
    if tgt_lon.max() > src_lon.max() + 1e-6:
        raise ValueError(
            f"{name}: target lon max {tgt_lon.max():.4f} > source lon max {src_lon.max():.4f}"
        )


def regrid_surface_variables(
    qc_vars: Dict[str, xr.DataArray],
    common_lat: xr.DataArray,
    common_lon: xr.DataArray,
    canonical_time: pd.DatetimeIndex,
    interp_method: str = "linear",
) -> xr.Dataset:
    """
    Interpolate all surface variables to the uniform cell-centered grid,
    reindex onto canonical daily timeline, and merge SSS passes if needed.

    Returns:
        xr.Dataset with 7 aligned variables:
            SST, SSS, SSH, Current_U, Current_V, Wind_U, Wind_V
    """
    print("Regridding surface variables to cell-centered 0.25° grid...")

    tgt_lat = common_lat.values
    tgt_lon = common_lon.values

    interp_kwargs = {"fill_value": None}  # Prevent extrapolation

    def _interp_and_align(da: xr.DataArray, name: str) -> xr.DataArray:
        """Interpolate spatially and reindex to canonical time."""
        src_lat = da.latitude.values if "latitude" in da.coords else da.coords[list(da.dims)[1]].values
        src_lon = da.longitude.values if "longitude" in da.coords else da.coords[list(da.dims)[2]].values

        # Check if already on target grid
        lat_match = len(src_lat) == len(tgt_lat) and np.allclose(src_lat, tgt_lat, atol=1e-4)
        lon_match = len(src_lon) == len(tgt_lon) and np.allclose(src_lon, tgt_lon, atol=1e-4)

        if lat_match and lon_match:
            print(f"  {name}: already on target grid, skipping spatial interpolation")
            result = da
        else:
            _verify_no_extrapolation(name, src_lat, src_lon, tgt_lat, tgt_lon)
            result = da.interp(
                latitude=common_lat, longitude=common_lon,
                method=interp_method, kwargs=interp_kwargs,
            )

        # Reindex to canonical daily time axis
        result = result.reindex(time=canonical_time, method=None)
        return result

    # ── Individual variables ──────────────────────────────────────────────
    sst_common = _interp_and_align(qc_vars["sst"], "SST")

    ssh_common = _interp_and_align(qc_vars["ssh"], "SSH")

    current_u_common = _interp_and_align(qc_vars["current_u"], "Current_U")
    current_v_common = _interp_and_align(qc_vars["current_v"], "Current_V")

    wind_u_common = _interp_and_align(qc_vars["wind_u"], "Wind_U")
    wind_v_common = _interp_and_align(qc_vars["wind_v"], "Wind_V")

    # ── SSS ───────────────────────────────────────────────────────────────
    if "sss" in qc_vars:
        sss_common = _interp_and_align(qc_vars["sss"], "SSS")
        sss_common.name = "SSS"
        sss_common.attrs["long_name"] = "Sea surface salinity"
        sss_common.attrs["units"] = "PSU"
    else:
        # Legacy ascending/descending: interpolate separately, then combine
        sss_asc_common = _interp_and_align(qc_vars["sss_asc"], "SSS_asc")
        sss_desc_common = _interp_and_align(qc_vars["sss_desc"], "SSS_desc")

        asc_valid = sss_asc_common.notnull()
        desc_valid = sss_desc_common.notnull()

        sss_common = xr.where(
            asc_valid & desc_valid,
            (sss_asc_common + sss_desc_common) / 2.0,
            xr.where(asc_valid, sss_asc_common, sss_desc_common),
        )
        sss_common.name = "SSS"
        sss_common.attrs["long_name"] = "Combined practical sea surface salinity"
        sss_common.attrs["units"] = "PSU"

    # ── Assemble surface dataset ──────────────────────────────────────────
    surface_common = xr.Dataset({
        "SST": sst_common,
        "SSS": sss_common,
        "SSH": ssh_common,
        "Current_U": current_u_common,
        "Current_V": current_v_common,
        "Wind_U": wind_u_common,
        "Wind_V": wind_v_common,
    })

    # Rechunk for optimal downstream processing
    surface_common = surface_common.chunk({
        "time": 30,
        "latitude": len(common_lat),
        "longitude": len(common_lon),
    })

    print("✓ Surface variables regridded, time-aligned, and merged.")
    return surface_common


def regrid_glorys_target(
    glorys_qc: xr.DataArray,
    target_depths: List[float],
    common_lat: xr.DataArray,
    common_lon: xr.DataArray,
    canonical_time: pd.DatetimeIndex,
    interp_method: str = "linear",
) -> xr.DataArray:
    """
    Interpolate 3D GLORYS temperature vertically to standard depths,
    horizontally to common grid, and reindex onto canonical time.

    NOTE on 0 m depth: GLORYS native shallowest depth is ~0.494 m.
    The 0 m target level is represented using this shallowest native level
    as a surface proxy. This is a documented approximation — GLORYS does
    NOT contain an exact 0 m observation.

    No vertical extrapolation: the deepest target (1000 m) must be
    bracketed by valid native GLORYS depths.
    """
    print(f"Interpolating GLORYS vertically to {len(target_depths)} target depths...")

    native_depths = glorys_qc.depth.values
    native_shallowest = float(native_depths[0])
    native_deepest = float(native_depths[-1])

    print(f"  Native depth range: {native_shallowest:.3f} → {native_deepest:.3f} m")
    print(f"  Target depths: {target_depths}")

    # Verify deepest target is bracketed
    if target_depths[-1] > native_deepest:
        raise ValueError(
            f"GLORYS: deepest target depth {target_depths[-1]} m exceeds "
            f"deepest native depth {native_deepest:.3f} m — would require extrapolation."
        )

    # Keep native GLORYS depths unchanged for interpolation.
    # We will interpolate for depths > 0, and use the shallowest native level as 0m.
    target_depths_no_zero = [d for d in target_depths if d > 0]
    
    target_depths_da = xr.DataArray(
        [float(d) for d in target_depths_no_zero], dims="depth", name="depth"
    )

    print(f"  Interpolating natively at depths: {target_depths_no_zero}")
    theta_at_depths = glorys_qc.interp(
        depth=target_depths_da,
        method=interp_method,
        kwargs={"fill_value": None},  # No vertical extrapolation
    )

    print(f"  Using shallowest native level ({native_shallowest:.3f} m) as 0 m surface proxy")
    surface_proxy = glorys_qc.isel(depth=0).expand_dims(depth=[0.0])

    thetao_15depth = xr.concat([surface_proxy, theta_at_depths], dim="depth")

    # Verify 15 depth levels
    assert len(thetao_15depth.depth) == 15, \
        f"Expected 15 depth levels, got {len(thetao_15depth.depth)}"
    assert np.allclose(thetao_15depth.depth.values, target_depths, atol=1e-6), \
        f"Depth coordinate mismatch: {thetao_15depth.depth.values} vs {target_depths}"

    # ── Horizontal interpolation ──────────────────────────────────────────
    print("Interpolating GLORYS horizontally to cell-centered 0.25° grid...")

    src_lat = glorys_qc.latitude.values
    src_lon = glorys_qc.longitude.values
    _verify_no_extrapolation("GLORYS", src_lat, src_lon, common_lat.values, common_lon.values)

    thetao_common = thetao_15depth.interp(
        latitude=common_lat, longitude=common_lon,
        method=interp_method,
        kwargs={"fill_value": None},
    )

    # Reindex to canonical time
    thetao_common = thetao_common.reindex(time=canonical_time, method=None)

    print("✓ GLORYS 3D target regridding complete.")
    return thetao_common
