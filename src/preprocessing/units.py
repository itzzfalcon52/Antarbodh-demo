"""Unit conversion and verification for ANTARBODH datasets.

Handles:
- SST:  Kelvin → Celsius
- SSS:  verify product convention (no blind scaling)
- SSH:  metres (no conversion needed, verify)
- Currents:  m/s (verify)
- Winds:  m/s (verify)
- GLORYS thetao:  already in °C (verify)
"""

import warnings

import numpy as np
import xarray as xr


# ---------------------------------------------------------------------------
# Physical range expectations (used for sanity checks)
# ---------------------------------------------------------------------------

EXPECTED_RANGES = {
    "sst":             (-2.0, 40.0),      # °C after conversion
    "sss":             (0.0, 45.0),        # PSU (practical salinity)
    "ssh":             (-3.0, 3.0),        # metres
    "current_u":       (-5.0, 5.0),        # m/s
    "current_v":       (-5.0, 5.0),        # m/s
    "wind_u":          (-50.0, 50.0),      # m/s
    "wind_v":          (-50.0, 50.0),      # m/s
    "glorys_thetao":   (-2.0, 40.0),       # °C
}


def convert_sst_kelvin_to_celsius(da: xr.DataArray) -> xr.DataArray:
    """Convert SST from Kelvin to Celsius.

    Parameters
    ----------
    da : xr.DataArray
        SST data, potentially in Kelvin.

    Returns
    -------
    xr.DataArray
        SST in degrees Celsius.
    """
    # Detect Kelvin by checking whether valid values are > 200
    valid = da.values[np.isfinite(da.values)]
    if len(valid) == 0:
        warnings.warn("SST DataArray contains no valid values; skipping conversion.")
        return da

    if np.nanmedian(valid) > 200.0:
        da = da - 273.15
        da.attrs["units"] = "degC"
        da.attrs["unit_conversion"] = "Kelvin to Celsius (subtracted 273.15)"
    else:
        # Already in Celsius (or at least not in Kelvin)
        if "units" not in da.attrs:
            da.attrs["units"] = "degC"

    return da


def verify_units(da: xr.DataArray, variable_key: str) -> xr.DataArray:
    """Verify that values fall within expected physical ranges.

    Issues a warning (but does NOT modify data) if a significant fraction
    of values are outside the expected range.

    Parameters
    ----------
    da : xr.DataArray
        The data variable.
    variable_key : str
        One of the keys in ``EXPECTED_RANGES``.

    Returns
    -------
    xr.DataArray
        Unchanged input (warnings may be raised).
    """
    if variable_key not in EXPECTED_RANGES:
        return da

    lo, hi = EXPECTED_RANGES[variable_key]
    valid = da.values[np.isfinite(da.values)]
    if len(valid) == 0:
        return da

    out_of_range = np.sum((valid < lo) | (valid > hi))
    frac = out_of_range / len(valid) * 100

    if frac > 1.0:
        warnings.warn(
            f"[{variable_key}] {frac:.2f}% of valid values are outside "
            f"expected range [{lo}, {hi}]. "
            f"Observed min={np.nanmin(valid):.4f}, max={np.nanmax(valid):.4f}. "
            f"Check units."
        )

    return da
