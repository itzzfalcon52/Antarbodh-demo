"""Shared utilities for the ANTARBODH preprocessing pipeline.

Provides:
- Configuration loading
- Common grid definition (0.25° Bay of Bengal)
- Target depth levels
- File-path helpers
"""

from pathlib import Path

import numpy as np
import yaml

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CONFIG_PATH = Path("configs/prototype.yaml")


def load_config(path: str | Path | None = None) -> dict:
    """Load the prototype YAML configuration.

    Parameters
    ----------
    path : str or Path, optional
        Override path to the config file.  Defaults to ``configs/prototype.yaml``
        relative to the repository root.
    """
    p = Path(path) if path is not None else CONFIG_PATH
    if not p.exists():
        raise FileNotFoundError(
            f"Configuration not found: {p}. "
            "Run this script from the repository root."
        )
    with p.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


# ---------------------------------------------------------------------------
# Common grid
# ---------------------------------------------------------------------------

def common_grid(cfg: dict | None = None):
    """Return the common 0.25° latitude/longitude coordinate arrays.

    The grid centres are placed at half-resolution offsets from the domain
    boundaries so that the outermost cells sit fully inside the domain.

    Returns
    -------
    lat : np.ndarray
        1-D latitude array (ascending), e.g. 5.125 … 19.875.
    lon : np.ndarray
        1-D longitude array (ascending), e.g. 80.125 … 99.875.
    """
    if cfg is None:
        cfg = load_config()

    region = cfg["region"]
    grid = cfg.get("target_grid", {})
    res_lat = grid.get("resolution_lat", 0.25)
    res_lon = grid.get("resolution_lon", 0.25)

    lat = np.arange(
        region["min_lat"] + res_lat / 2,
        region["max_lat"],
        res_lat,
    )
    lon = np.arange(
        region["min_lon"] + res_lon / 2,
        region["max_lon"],
        res_lon,
    )
    return lat, lon


def target_depths(cfg: dict | None = None) -> list[float]:
    """Return the 15 standard target depth levels from configuration."""
    if cfg is None:
        cfg = load_config()
    return [float(d) for d in cfg["target_depths"]]


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

_RAW = {
    "glorys":          "data/raw/glorys/glorys_bob.nc",
    "sst":             "data/raw/sst/sst_bob.nc",
    "sss_ascending":   "data/raw/sss/sss_bob_ascending.nc",
    "sss_descending":  "data/raw/sss/sss_bob_descending.nc",
    "ssh":             "data/raw/ssh/ssh_bob.nc",
    "currents":        "data/raw/currents/currents_bob.nc",
    "winds":           "data/raw/winds/winds_bob.nc",
}


def raw_path(dataset_key: str) -> Path:
    """Return the expected raw-file path for *dataset_key*.

    Valid keys: glorys, sst, sss_ascending, sss_descending, ssh, currents, winds.
    """
    if dataset_key not in _RAW:
        raise KeyError(
            f"Unknown dataset key '{dataset_key}'. "
            f"Valid keys: {list(_RAW.keys())}"
        )
    return Path(_RAW[dataset_key])


def processed_dir() -> Path:
    """Return (and create) the processed-data output directory."""
    p = Path("data/processed")
    p.mkdir(parents=True, exist_ok=True)
    return p


def interim_dir() -> Path:
    """Return (and create) the interim-data output directory."""
    p = Path("data/interim")
    p.mkdir(parents=True, exist_ok=True)
    return p
