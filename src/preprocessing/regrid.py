"""Regridding, spatial harmonization, and 3D vertical interpolation."""

from typing import Dict, List, Tuple
import numpy as np
import xarray as xr


def build_common_grid(
    min_lat: float = 5.125,
    max_lat: float = 20.0,
    min_lon: float = 80.125,
    max_lon: float = 100.0,
    resolution: float = 0.25,
) -> Tuple[xr.DataArray, xr.DataArray]:
    """Construct regular target latitude and longitude grid coordinates."""
    lats = np.arange(min_lat, max_lat, resolution)
    lons = np.arange(min_lon, max_lon, resolution)

    common_lat = xr.DataArray(lats, dims="latitude", name="latitude")
    common_lon = xr.DataArray(lons, dims="longitude", name="longitude")
    return common_lat, common_lon


def regrid_surface_variables(
    qc_vars: Dict[str, xr.DataArray],
    common_lat: xr.DataArray,
    common_lon: xr.DataArray,
) -> xr.Dataset:
    """
    Interpolate all surface variables to the uniform 0.25° grid and merge SSS passes.

    Returns:
        xr.Dataset containing 7 aligned variables:
            SST, SSS, SSH, Current_U, Current_V, Wind_U, Wind_V
    """
    print("Regridding surface variables to uniform 0.25° grid...")

    sst_common = qc_vars["sst"].interp(latitude=common_lat, longitude=common_lon)

    if "sss" in qc_vars:
        sss_common = qc_vars["sss"].interp(latitude=common_lat, longitude=common_lon)
        sss_common.name = "SSS"
        sss_common.attrs["long_name"] = "Sea surface salinity"
        sss_common.attrs["units"] = "0.001"
    else:
        sss_asc_common = qc_vars["sss_asc"].interp(latitude=common_lat, longitude=common_lon)
        sss_desc_common = qc_vars["sss_desc"].interp(latitude=common_lat, longitude=common_lon)

        # Combine ascending and descending SSS observations
        asc_valid = sss_asc_common.notnull()
        desc_valid = sss_desc_common.notnull()
        sss_common = xr.where(
            asc_valid & desc_valid,
            (sss_asc_common + sss_desc_common) / 2.0,
            xr.where(asc_valid, sss_asc_common, sss_desc_common),
        )
        sss_common.name = "SSS"
        sss_common.attrs["long_name"] = "Combined practical sea surface salinity"
        sss_common.attrs["units"] = "0.001"

    ssh_common = qc_vars["ssh"].interp(latitude=common_lat, longitude=common_lon)
    current_u_common = qc_vars["current_u"].interp(latitude=common_lat, longitude=common_lon)
    current_v_common = qc_vars["current_v"].interp(latitude=common_lat, longitude=common_lon)
    wind_u_common = qc_vars["wind_u"].interp(latitude=common_lat, longitude=common_lon)
    wind_v_common = qc_vars["wind_v"].interp(latitude=common_lat, longitude=common_lon)

    # Drop non-essential depth dimension from surface velocity if present
    if "depth" in current_u_common.dims:
        current_u_common = current_u_common.sel(depth=0, drop=True)
    if "depth" in current_v_common.dims:
        current_v_common = current_v_common.sel(depth=0, drop=True)

    surface_common = xr.Dataset({
        "SST": sst_common,
        "SSS": sss_common,
        "SSH": ssh_common,
        "Current_U": current_u_common,
        "Current_V": current_v_common,
        "Wind_U": wind_u_common,
        "Wind_V": wind_v_common,
    })

    # Rechunk surface dataset for optimal streaming
    surface_common = surface_common.chunk({
        "time": 30,
        "latitude": len(common_lat),
        "longitude": len(common_lon),
    })

    print("✓ Surface variables regridded and merged.")
    return surface_common


def regrid_glorys_target(
    glorys_qc: xr.DataArray,
    target_depths: List[float],
    common_lat: xr.DataArray,
    common_lon: xr.DataArray,
) -> xr.DataArray:
    """
    Interpolate 3D GLORYS temperature vertically to standard depths and horizontally to common grid.

    Args:
        glorys_qc: QC-checked thetao DataArray.
        target_depths: List of target depth levels in meters.
        common_lat: Target latitude coordinate DataArray.
        common_lon: Target longitude coordinate DataArray.

    Returns:
        xr.DataArray: Regridded subsurface temperature tensor.
    """
    print(f"Interpolating GLORYS vertically to {len(target_depths)} target depths...")
    target_depths_da = xr.DataArray(target_depths, dims="depth", name="depth")

    # Handle shallowest coordinate: native shallowest layer is ~0.49m; map to 0m for interpolation
    thetao_for_interp = glorys_qc.assign_coords(
        depth=xr.where(glorys_qc.depth == glorys_qc.depth[0], 0.0, glorys_qc.depth)
    )

    thetao_15depth = thetao_for_interp.interp(depth=target_depths_da)

    print("Interpolating GLORYS horizontally to common 0.25° grid...")
    thetao_common = thetao_15depth.interp(latitude=common_lat, longitude=common_lon)

    print("✓ GLORYS 3D target regridding complete.")
    return thetao_common
