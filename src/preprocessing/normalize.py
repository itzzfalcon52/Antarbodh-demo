"""Input normalization for ANTARBODH.

Per-channel standardization using training-set statistics only.
Normalization statistics are saved/loaded from disk so that validation
and test data use the same transform.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import xarray as xr


def compute_channel_stats(
    X: xr.DataArray,
    channel_dim: str = "channel",
) -> dict[str, dict[str, float]]:
    """Compute per-channel mean and std from a training input tensor.

    Parameters
    ----------
    X : xr.DataArray
        Training inputs with shape ``(time, channel, latitude, longitude)``.
    channel_dim : str
        Name of the channel dimension.

    Returns
    -------
    dict
        ``{channel_name: {"mean": ..., "std": ...}}``.
    """
    stats = {}
    for i, ch in enumerate(X[channel_dim].values):
        ch_data = X.isel({channel_dim: i})
        ch_mean = float(ch_data.mean(skipna=True).item())
        ch_std  = float(ch_data.std(skipna=True).item())
        # Prevent division by zero
        if ch_std == 0 or np.isnan(ch_std):
            ch_std = 1.0
        stats[str(ch)] = {"mean": ch_mean, "std": ch_std}
    return stats


def save_stats(stats: dict, path: str | Path) -> None:
    """Save normalization statistics to a JSON file.

    Parameters
    ----------
    stats : dict
        Output of ``compute_channel_stats()``.
    path : str or Path
        Destination file path.
    """
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as fh:
        json.dump(stats, fh, indent=2)


def load_stats(path: str | Path) -> dict:
    """Load previously saved normalization statistics.

    Parameters
    ----------
    path : str or Path
        Path to the JSON file.

    Returns
    -------
    dict
        ``{channel_name: {"mean": ..., "std": ...}}``.
    """
    with Path(path).open("r", encoding="utf-8") as fh:
        return json.load(fh)


def normalize(
    X: xr.DataArray,
    stats: dict,
    channel_dim: str = "channel",
) -> xr.DataArray:
    """Apply per-channel z-score normalization.

    .. math::
        X_{\\text{norm}} = \\frac{X - \\mu}{\\sigma}

    Parameters
    ----------
    X : xr.DataArray
        Input tensor ``(time, channel, latitude, longitude)``.
    stats : dict
        Per-channel statistics from ``compute_channel_stats()`` or
        ``load_stats()``.
    channel_dim : str
        Name of the channel dimension.

    Returns
    -------
    xr.DataArray
        Normalized input tensor.
    """
    X_norm = X.copy(deep=True)
    for i, ch in enumerate(X[channel_dim].values):
        ch_key = str(ch)
        if ch_key not in stats:
            raise KeyError(
                f"Channel '{ch_key}' not found in normalization stats. "
                f"Available: {list(stats.keys())}"
            )
        mean = stats[ch_key]["mean"]
        std  = stats[ch_key]["std"]
        X_norm[{channel_dim: i}] = (X_norm.isel({channel_dim: i}) - mean) / std

    X_norm.attrs["normalization"] = "per-channel z-score"
    return X_norm


def denormalize(
    X_norm: xr.DataArray,
    stats: dict,
    channel_dim: str = "channel",
) -> xr.DataArray:
    """Reverse per-channel normalization.

    Parameters
    ----------
    X_norm : xr.DataArray
        Normalized tensor.
    stats : dict
        Same statistics used for normalization.
    channel_dim : str
        Name of the channel dimension.

    Returns
    -------
    xr.DataArray
        Denormalized tensor.
    """
    X_out = X_norm.copy(deep=True)
    for i, ch in enumerate(X_norm[channel_dim].values):
        ch_key = str(ch)
        mean = stats[ch_key]["mean"]
        std  = stats[ch_key]["std"]
        X_out[{channel_dim: i}] = X_out.isel({channel_dim: i}) * std + mean
    return X_out
