"""GLORYS vertical interpolation for ANTARBODH.

Interpolates GLORYS ``thetao`` from its 36 native depth levels to the
15 standard target depths defined in ``configs/prototype.yaml``.

Also handles horizontal regridding of the GLORYS target to the common
0.25° grid.

Notes
-----
- The shallowest GLORYS native level is ~0.494 m, not exactly 0 m.
  The 0 m target depth is obtained via extrapolation from the nearest
  native levels (documented in output attributes).
- The deepest GLORYS native level in the Bay of Bengal subset is
  ~1062 m, which supports the 1000 m target.
"""

from __future__ import annotations

import warnings

import numpy as np
import xarray as xr

from .common import common_grid, target_depths
from .regrid import regrid_to_common


def interpolate_to_target_depths(
    thetao: xr.DataArray,
    cfg: dict | None = None,
    method: str = "linear",
) -> xr.DataArray:
    """Interpolate GLORYS temperature to the 15 standard target depths.

    Parameters
    ----------
    thetao : xr.DataArray
        GLORYS ``thetao`` with a ``depth`` dimension.
    cfg : dict, optional
        Project configuration.
    method : str
        Interpolation method for ``xr.DataArray.interp()``.

    Returns
    -------
    xr.DataArray
        Temperature at the 15 target depths.
    """
    depths = target_depths(cfg)

    # Sanity: check deepest native level covers deepest target
    native_max = float(thetao.depth.max().item())
    target_max = max(depths)
    if native_max < target_max:
        warnings.warn(
            f"Deepest GLORYS native level ({native_max:.2f} m) is shallower than "
            f"the deepest target ({target_max} m). "
            f"Values at {target_max} m will be extrapolated/NaN."
        )

    # Shallowest native level
    native_min = float(thetao.depth.min().item())
    if native_min > 0:
        # Document the 0 m handling
        warnings.warn(
            f"Shallowest GLORYS native depth is {native_min:.3f} m, not 0 m. "
            f"The 0 m target is obtained via interpolation/extrapolation.",
            stacklevel=2,
        )

    result = thetao.interp(
        depth=depths,
        method=method,
        kwargs={"fill_value": "extrapolate"},
    )

    result.attrs = thetao.attrs.copy()
    result.attrs["vertical_interpolation"] = method
    result.attrs["target_depths"] = depths
    result.attrs["note_0m"] = (
        f"0 m target extrapolated from shallowest native depth ({native_min:.3f} m)"
    )

    return result


def process_glorys(
    ds: xr.Dataset,
    cfg: dict | None = None,
    variable: str = "thetao",
) -> xr.DataArray:
    """Full GLORYS processing: vertical interpolation + horizontal regridding.

    Parameters
    ----------
    ds : xr.Dataset
        Raw GLORYS dataset.
    cfg : dict, optional
        Project configuration.
    variable : str
        Variable name to extract (default ``"thetao"``).

    Returns
    -------
    xr.DataArray
        GLORYS temperature on the common grid at 15 target depths.
        Shape: ``(time, depth=15, latitude=60, longitude=80)``.
    """
    thetao = ds[variable]

    # Step 1: horizontal regridding (native ~0.083° → 0.25°)
    thetao_regridded = regrid_to_common(thetao, cfg)

    # Step 2: vertical interpolation (native 36 → target 15 depths)
    thetao_15 = interpolate_to_target_depths(thetao_regridded, cfg)

    return thetao_15
