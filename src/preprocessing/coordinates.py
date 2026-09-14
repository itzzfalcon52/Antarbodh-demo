"""Coordinate normalization for ANTARBODH datasets.

Ensures every dataset uses the canonical coordinate names
(``latitude``, ``longitude``, ``time``, ``depth``), that coordinates are
sorted in ascending order, and that duplicate coordinate values are removed.
"""

import xarray as xr

# ---------------------------------------------------------------------------
# Canonical coordinate name mapping
# ---------------------------------------------------------------------------

_ALIASES = {
    # latitude
    "lat":        "latitude",
    "Latitude":   "latitude",
    "LAT":        "latitude",
    "nav_lat":    "latitude",
    "y":          "latitude",
    # longitude
    "lon":        "longitude",
    "Longitude":  "longitude",
    "LON":        "longitude",
    "nav_lon":    "longitude",
    "x":          "longitude",
    # time
    "Time":       "time",
    "TIME":       "time",
    "t":          "time",
    # depth
    "Depth":      "depth",
    "DEPTH":      "depth",
    "z":          "depth",
    "lev":        "depth",
    "level":      "depth",
}


def _rename_coords(ds: xr.Dataset) -> xr.Dataset:
    """Rename coordinates/dimensions to canonical names."""
    rename_map = {}
    for old, canonical in _ALIASES.items():
        if old in ds.dims or old in ds.coords:
            if canonical not in ds.dims and canonical not in ds.coords:
                rename_map[old] = canonical
    if rename_map:
        ds = ds.rename(rename_map)
    return ds


def _sort_ascending(ds: xr.Dataset) -> xr.Dataset:
    """Sort latitude, longitude, and depth in ascending order."""
    for coord in ("latitude", "longitude", "depth"):
        if coord in ds.dims:
            ds = ds.sortby(coord)
    return ds


def _drop_duplicate_coords(ds: xr.Dataset) -> xr.Dataset:
    """Drop duplicate coordinate values (keeps first occurrence)."""
    for coord in ("latitude", "longitude", "time", "depth"):
        if coord in ds.dims:
            _, idx = xr.DataArray(ds[coord].values).to_index().drop_duplicates(
            ).sort_values(), None  # noqa: E501
            # Simpler approach: use pandas under the hood
            import pandas as pd

            vals = pd.Index(ds[coord].values)
            unique_mask = ~vals.duplicated(keep="first")
            ds = ds.isel({coord: unique_mask})
    return ds


def normalize_coordinates(ds: xr.Dataset) -> xr.Dataset:
    """Apply full coordinate normalization to a dataset.

    Steps
    -----
    1. Rename known aliases → canonical names.
    2. Sort latitude, longitude, depth ascending.
    3. Drop duplicate coordinate values.

    Parameters
    ----------
    ds : xr.Dataset
        Raw dataset opened from NetCDF.

    Returns
    -------
    xr.Dataset
        Dataset with normalized coordinates.
    """
    ds = _rename_coords(ds)
    ds = _sort_ascending(ds)
    ds = _drop_duplicate_coords(ds)
    return ds
