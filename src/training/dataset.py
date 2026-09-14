"""PyTorch Dataset for ANTARBODH training.

Loads processed NetCDF tensors (``data/processed/inputs.nc`` and
``data/processed/targets.nc``) and provides:
- Temporal train/val/test splitting
- Optional spatial patch extraction
- NaN-aware masking
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from torch.utils.data import Dataset
import xarray as xr


class AntarBodhDataset(Dataset):
    """PyTorch Dataset for ANTARBODH subsurface temperature reconstruction.

    Expects a preprocessed NetCDF file containing:
      X       (time, channel, lat, lon) - 14 channels
      Y       (time, depth, lat, lon)   - 15 depths
      Y_mask  (time, depth, lat, lon)   - binary mask for valid Y cells

    Parameters
    ----------
    nc_path : str or Path
        Path to the pre-split NetCDF file (e.g. `train.nc`, `val.nc`).
    patch_size : int or None
        If given, extract random spatial patches of this size during
        ``__getitem__``. If ``None``, return the full spatial field.
    """

    def __init__(
        self,
        nc_path: str | Path,
        patch_size: int | None = None,
    ):
        super().__init__()
        self.nc_path = Path(nc_path)
        self.patch_size = patch_size
        
        if not self.nc_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {self.nc_path}")

        # Load data fully into memory for fast training
        print(f"Loading {self.nc_path.name} into memory...")
        ds = xr.open_dataset(self.nc_path).load()

        if "X" not in ds or "Y" not in ds or "Y_mask" not in ds:
            raise ValueError("Dataset must contain X, Y, and Y_mask variables.")

        # Assign to numpy arrays
        self.X = ds["X"].values.astype(np.float32)       # (T, 14, H, W)
        self.Y = ds["Y"].values.astype(np.float32)       # (T, 15, H, W)
        self.Y_mask = ds["Y_mask"].values.astype(np.float32) # (T, 15, H, W)
        
        self.n_times = self.X.shape[0]
        self.height = self.X.shape[2]
        self.width = self.X.shape[3]

        # Explicit Contract Validation
        self._validate_contract()
        ds.close()

    def _validate_contract(self):
        """Validates that the dataset adheres strictly to the ANTARBODH scientific contract."""
        # 1. Dimensionality
        assert self.X.ndim == 4, f"X must be 4D (time, channel, lat, lon), got {self.X.ndim}D"
        assert self.Y.ndim == 4, f"Y must be 4D (time, depth, lat, lon), got {self.Y.ndim}D"
        assert self.Y_mask.ndim == 4, f"Y_mask must be 4D, got {self.Y_mask.ndim}D"
        
        # 2. Shape matching
        assert self.X.shape[0] == self.Y.shape[0] == self.Y_mask.shape[0], "Time dimensions do not match"
        assert self.X.shape[2:] == self.Y.shape[2:] == self.Y_mask.shape[2:], "Spatial dimensions do not match"
        
        # 3. Channel Counts
        assert self.X.shape[1] == 14, f"X must have exactly 14 channels, got {self.X.shape[1]}"
        assert self.Y.shape[1] == 15, f"Y must have exactly 15 depth target levels, got {self.Y.shape[1]}"
        
        # 4. Binary Mask Validation
        unique_mask_vals = np.unique(self.Y_mask)
        assert set(unique_mask_vals).issubset({0.0, 1.0}), f"Y_mask must be binary (0 or 1). Found: {unique_mask_vals}"
        
        # 5. NaN Audit: Data should already be scientifically preprocessed and zero-filled.
        #    The Dataset shouldn't be responsible for guessing how to handle NaNs.
        if not np.isfinite(self.X).all():
            raise ValueError("X contains NaN/Inf values! Preprocessing should have handled this.")
        if not np.isfinite(self.Y).all():
            raise ValueError("Y contains NaN/Inf values! Preprocessing should have handled this.")
        if not np.isfinite(self.Y_mask).all():
            raise ValueError("Y_mask contains NaN/Inf values! Preprocessing should have handled this.")

    def __len__(self) -> int:
        return self.n_times

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        x = self.X[idx]       # (14, H, W)
        y = self.Y[idx]       # (15, H, W)
        y_mask = self.Y_mask[idx] # (15, H, W)

        # Optional spatial patch extraction
        if self.patch_size is not None and self.patch_size < min(self.height, self.width):
            h_start = np.random.randint(0, self.height - self.patch_size)
            w_start = np.random.randint(0, self.width - self.patch_size)
            h_end = h_start + self.patch_size
            w_end = w_start + self.patch_size

            x = x[:, h_start:h_end, w_start:w_end]
            y = y[:, h_start:h_end, w_start:w_end]
            y_mask = y_mask[:, h_start:h_end, w_start:w_end]

        return {
            "input":       torch.from_numpy(x),
            "target":      torch.from_numpy(y),
            "target_mask": torch.from_numpy(y_mask),
        }
