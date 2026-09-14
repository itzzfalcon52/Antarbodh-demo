"""SSS ascending / descending combination for ANTARBODH.

The Copernicus Marine SSS product provides separate ascending and descending
SMOS daily datasets.  This module combines them into a single SSS channel
using the rule documented in the Data Audit:

    both valid   →  mean(ascending, descending)
    only one     →  use the available value
    both missing →  NaN
"""

from __future__ import annotations

import numpy as np
import xarray as xr


def combine_sss(
    sss_asc: xr.DataArray,
    sss_desc: xr.DataArray,
) -> xr.DataArray:
    """Combine ascending and descending SSS into one channel.

    Parameters
    ----------
    sss_asc : xr.DataArray
        Ascending-pass SSS.
    sss_desc : xr.DataArray
        Descending-pass SSS.

    Returns
    -------
    xr.DataArray
        Combined SSS.  Attributes record the combination method and
        missingness improvement.
    """
    asc_valid = sss_asc.notnull()
    desc_valid = sss_desc.notnull()

    both = asc_valid & desc_valid
    only_asc = asc_valid & ~desc_valid
    only_desc = ~asc_valid & desc_valid

    # Start with NaN everywhere
    combined = xr.full_like(sss_asc, fill_value=np.nan)

    # Where both are valid, take the mean
    combined = combined.where(~both, (sss_asc + sss_desc) / 2.0)

    # Where only ascending is valid
    combined = combined.where(~only_asc, sss_asc)

    # Where only descending is valid
    combined = combined.where(~only_desc, sss_desc)

    # Compute diagnostics
    total = int(combined.size)
    n_both = int(both.sum().item())
    n_only_asc = int(only_asc.sum().item())
    n_only_desc = int(only_desc.sum().item())
    n_combined_valid = int(combined.notnull().sum().item())
    n_still_missing = total - n_combined_valid

    combined.attrs = {
        "long_name":    "Combined Sea Surface Salinity",
        "units":        sss_asc.attrs.get("units", "PSU"),
        "source":       "ascending + descending SMOS daily",
        "combination":  "mean where both valid, single where one valid",
        "both_valid":   n_both,
        "only_ascending_valid":  n_only_asc,
        "only_descending_valid": n_only_desc,
        "combined_valid": n_combined_valid,
        "still_missing":  n_still_missing,
        "still_missing_pct": round(n_still_missing / total * 100, 2) if total > 0 else 0,
    }

    return combined


def sss_overlap_diagnostics(
    sss_asc: xr.DataArray,
    sss_desc: xr.DataArray,
) -> dict:
    """Compute overlap and difference diagnostics between ascending/descending SSS.

    Returns
    -------
    dict
        Overlap count/percentage, and difference statistics where both exist.
    """
    asc_valid = sss_asc.notnull()
    desc_valid = sss_desc.notnull()
    overlap = asc_valid & desc_valid

    total = int(sss_asc.size)
    n_overlap = int(overlap.sum().item())

    result = {
        "total_cells": total,
        "ascending_valid":  int(asc_valid.sum().item()),
        "descending_valid": int(desc_valid.sum().item()),
        "overlap_count":    n_overlap,
        "overlap_pct":      round(n_overlap / total * 100, 4) if total > 0 else 0,
        "both_missing":     int(((~asc_valid) & (~desc_valid)).sum().item()),
    }

    if n_overlap > 0:
        diff = (sss_asc.where(overlap) - sss_desc.where(overlap))
        diff_vals = diff.values[np.isfinite(diff.values)]
        result["diff_min"]  = float(np.min(diff_vals))
        result["diff_max"]  = float(np.max(diff_vals))
        result["diff_mean"] = float(np.mean(diff_vals))
        result["diff_std"]  = float(np.std(diff_vals))

    return result
