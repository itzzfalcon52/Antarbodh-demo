"""Final validation for processed ANTARBODH data.

Checks tensor shapes, coordinate consistency, value ranges, and
generates a JSON preprocessing report.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import numpy as np
import xarray as xr

from .common import common_grid, target_depths


def validate_input_shape(
    X: xr.DataArray,
    expected_channels: int = 7,
    expected_lat: int = 60,
    expected_lon: int = 80,
) -> list[str]:
    """Validate the surface input tensor shape.

    Parameters
    ----------
    X : xr.DataArray
        Expected shape ``(time, channel, latitude, longitude)``.

    Returns
    -------
    list[str]
        List of warnings/errors. Empty if all checks pass.
    """
    issues = []

    if "time" not in X.dims:
        issues.append("Missing 'time' dimension")
    if "channel" not in X.dims:
        issues.append("Missing 'channel' dimension")
    if "latitude" not in X.dims:
        issues.append("Missing 'latitude' dimension")
    if "longitude" not in X.dims:
        issues.append("Missing 'longitude' dimension")

    if "channel" in X.dims and X.sizes["channel"] != expected_channels:
        issues.append(
            f"Expected {expected_channels} channels, got {X.sizes['channel']}"
        )
    if "latitude" in X.dims and X.sizes["latitude"] != expected_lat:
        issues.append(
            f"Expected latitude={expected_lat}, got {X.sizes['latitude']}"
        )
    if "longitude" in X.dims and X.sizes["longitude"] != expected_lon:
        issues.append(
            f"Expected longitude={expected_lon}, got {X.sizes['longitude']}"
        )

    return issues


def validate_target_shape(
    Y: xr.DataArray,
    expected_depths: int = 15,
    expected_lat: int = 60,
    expected_lon: int = 80,
) -> list[str]:
    """Validate the GLORYS target tensor shape.

    Parameters
    ----------
    Y : xr.DataArray
        Expected shape ``(time, depth, latitude, longitude)``.

    Returns
    -------
    list[str]
        List of warnings/errors.
    """
    issues = []

    if "time" not in Y.dims:
        issues.append("Missing 'time' dimension")
    if "depth" not in Y.dims:
        issues.append("Missing 'depth' dimension")
    if "latitude" not in Y.dims:
        issues.append("Missing 'latitude' dimension")
    if "longitude" not in Y.dims:
        issues.append("Missing 'longitude' dimension")

    if "depth" in Y.dims and Y.sizes["depth"] != expected_depths:
        issues.append(
            f"Expected depth={expected_depths}, got {Y.sizes['depth']}"
        )
    if "latitude" in Y.dims and Y.sizes["latitude"] != expected_lat:
        issues.append(
            f"Expected latitude={expected_lat}, got {Y.sizes['latitude']}"
        )
    if "longitude" in Y.dims and Y.sizes["longitude"] != expected_lon:
        issues.append(
            f"Expected longitude={expected_lon}, got {Y.sizes['longitude']}"
        )

    return issues


def validate_coordinates(
    X: xr.DataArray,
    Y: xr.DataArray,
    cfg: dict | None = None,
) -> list[str]:
    """Verify that input and target share the same lat/lon/time coordinates."""
    issues = []

    # Latitude
    if "latitude" in X.dims and "latitude" in Y.dims:
        if not np.allclose(X.latitude.values, Y.latitude.values, atol=1e-6):
            issues.append("Latitude coordinates do not match between X and Y")

    # Longitude
    if "longitude" in X.dims and "longitude" in Y.dims:
        if not np.allclose(X.longitude.values, Y.longitude.values, atol=1e-6):
            issues.append("Longitude coordinates do not match between X and Y")

    # Time
    if "time" in X.dims and "time" in Y.dims:
        if not np.array_equal(X.time.values, Y.time.values):
            issues.append("Time coordinates do not match between X and Y")

    # Target depths
    if cfg is not None and "depth" in Y.dims:
        expected = target_depths(cfg)
        if not np.allclose(Y.depth.values, expected, atol=0.5):
            issues.append(
                f"Target depths do not match config. "
                f"Expected {expected}, got {list(Y.depth.values)}"
            )

    return issues


def generate_report(
    X: xr.DataArray,
    Y: xr.DataArray,
    cfg: dict,
    output_path: str | Path | None = None,
) -> dict:
    """Generate a JSON preprocessing report.

    Parameters
    ----------
    X : xr.DataArray
        Processed surface inputs.
    Y : xr.DataArray
        Processed GLORYS targets.
    cfg : dict
        Project configuration.
    output_path : str or Path, optional
        If given, saves the report to this path.

    Returns
    -------
    dict
        Report contents.
    """
    report = {
        "timestamp":   datetime.utcnow().isoformat() + "Z",
        "region": {
            "min_lat": cfg["region"]["min_lat"],
            "max_lat": cfg["region"]["max_lat"],
            "min_lon": cfg["region"]["min_lon"],
            "max_lon": cfg["region"]["max_lon"],
        },
        "time_range": {
            "start": cfg["time"]["start"],
            "end":   cfg["time"]["end"],
        },
        "input_shape":  list(X.shape),
        "target_shape": list(Y.shape),
        "input_dims":   list(X.dims),
        "target_dims":  list(Y.dims),
        "input_channels":  list(X.channel.values) if "channel" in X.dims else [],
        "target_depths":   list(Y.depth.values) if "depth" in Y.dims else [],
        "input_nan_pct":   round(
            float(X.isnull().sum().compute().item()) / X.size * 100, 4
        ) if X.size > 0 else 0,
        "target_nan_pct":  round(
            float(Y.isnull().sum().compute().item()) / Y.size * 100, 4
        ) if Y.size > 0 else 0,
        "validation_issues": (
            validate_input_shape(X)
            + validate_target_shape(Y)
            + validate_coordinates(X, Y, cfg)
        ),
    }

    if output_path is not None:
        p = Path(output_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, default=str)

    return report
