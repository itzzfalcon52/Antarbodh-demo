"""Observation masks and missingness statistics for ANTARBODH.

Creates binary validity masks that record which grid cells were originally
observed vs. missing, and computes missingness diagnostics.
"""

from __future__ import annotations

import numpy as np
import xarray as xr


def validity_mask(da: xr.DataArray) -> xr.DataArray:
    """Create a binary validity mask (1 = valid, 0 = missing/NaN).

    Parameters
    ----------
    da : xr.DataArray
        Data variable (may contain NaN).

    Returns
    -------
    xr.DataArray
        Float32 mask with the same coordinates as *da*.
    """
    return da.notnull().astype("float32")


def joint_validity_mask(*arrays: xr.DataArray) -> xr.DataArray:
    """Create a joint validity mask for paired variables (e.g. U/V).

    A cell is valid only if **all** input arrays are valid at that position.

    Parameters
    ----------
    *arrays : xr.DataArray
        Two or more DataArrays on the same grid.

    Returns
    -------
    xr.DataArray
        Float32 joint mask.
    """
    mask = arrays[0].notnull()
    for da in arrays[1:]:
        mask = mask & da.notnull()
    return mask.astype("float32")


def missingness_stats(da: xr.DataArray, name: str = "") -> dict:
    """Compute missingness statistics for a DataArray.

    Parameters
    ----------
    da : xr.DataArray
        Data variable.
    name : str
        Label for log output.

    Returns
    -------
    dict
        Dictionary with ``total``, ``valid``, ``missing``, ``missing_pct``.
    """
    total = int(da.size)
    n_valid = int(da.notnull().sum().item())
    n_missing = total - n_valid
    pct = n_missing / total * 100 if total > 0 else 0.0

    stats = {
        "name":        name,
        "total":       total,
        "valid":       n_valid,
        "missing":     n_missing,
        "missing_pct": round(pct, 4),
    }
    return stats


def missingness_by_depth(da: xr.DataArray) -> dict[float, float]:
    """Compute missing-value percentage for each depth level.

    Parameters
    ----------
    da : xr.DataArray
        Must have a ``depth`` dimension.

    Returns
    -------
    dict
        Mapping depth_value → missing percentage.
    """
    if "depth" not in da.dims:
        raise ValueError("DataArray must have a 'depth' dimension.")

    result = {}
    for d in da.depth.values:
        layer = da.sel(depth=d)
        total = int(layer.size)
        missing = int(layer.isnull().sum().item())
        result[float(d)] = round(missing / total * 100, 4) if total > 0 else 0.0

    return result


def build_input_masks(
    sst: xr.DataArray,
    sss: xr.DataArray,
    ssh: xr.DataArray,
    current_u: xr.DataArray,
    current_v: xr.DataArray,
    wind_u: xr.DataArray,
    wind_v: xr.DataArray,
) -> xr.Dataset:
    """Build observation masks for all 7 input channels.

    Returns a Dataset with five mask variables (currents and winds each
    use a joint mask).

    Parameters
    ----------
    sst, sss, ssh : xr.DataArray
        Scalar surface variables.
    current_u, current_v : xr.DataArray
        Surface current components.
    wind_u, wind_v : xr.DataArray
        Surface wind components.

    Returns
    -------
    xr.Dataset
        Masks: ``sst_valid``, ``sss_valid``, ``ssh_valid``,
        ``current_valid``, ``wind_valid``.
    """
    return xr.Dataset(
        {
            "sst_valid":     validity_mask(sst),
            "sss_valid":     validity_mask(sss),
            "ssh_valid":     validity_mask(ssh),
            "current_valid": joint_validity_mask(current_u, current_v),
            "wind_valid":    joint_validity_mask(wind_u, wind_v),
        }
    )


def print_dataset_coverage(masks: xr.Dataset, targets: xr.DataArray = None) -> None:
    """Print the coverage statistics for the input masks and targets.
    
    Coverage is defined as the percentage of valid (non-NaN) observations.

    Parameters
    ----------
    masks : xr.Dataset
        Dataset containing the validity masks (output of build_input_masks).
    targets : xr.DataArray, optional
        Target DataArray (Y) with a 'depth' dimension, by default None
    """
    print("========== INPUT COVERAGE ==========")
    joint_mask = None
    
    for var_name in masks.data_vars:
        mask_da = masks[var_name]
        coverage = (mask_da.sum().item() / mask_da.size) * 100
        print(f"{var_name:>15} | coverage = {coverage:.2f}%")
        
        if joint_mask is None:
            joint_mask = mask_da.astype(bool)
        else:
            joint_mask = joint_mask & mask_da.astype(bool)
            
    if joint_mask is not None:
        joint_coverage = (joint_mask.sum().item() / joint_mask.size) * 100
        print("-" * 38)
        print(f"{'JOINT ALL':>15} | coverage = {joint_coverage:.2f}%")
        print()

    if targets is not None:
        print("========== TARGET COVERAGE ==========")
        if "depth" not in targets.dims:
            print("Target DataArray is missing a 'depth' dimension.")
            return
            
        for d in targets.depth.values:
            layer = targets.sel(depth=d)
            total = int(layer.size)
            missing = int(layer.isnull().sum().item())
            valid_pct = ((total - missing) / total * 100) if total > 0 else 0.0
            print(f"{float(d):>4.0f} m | coverage = {valid_pct:.2f}%")

