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
    """PyTorch Dataset for subsurface temperature reconstruction.

    Parameters
    ----------
    inputs_path : str or Path
        Path to ``inputs.nc`` — shape ``(time, channel=7, lat, lon)``.
    targets_path : str or Path
        Path to ``targets.nc`` — shape ``(time, depth=15, lat, lon)``.
    masks_path : str or Path, optional
        Path to ``masks.nc`` — observation validity masks.
    split : str
        One of ``"train"``, ``"val"``, ``"test"``, ``"all"``.
    train_years : tuple
        Year range for training (inclusive), default ``(2020, 2023)``.
    val_years : tuple
        Year range for validation, default ``(2024, 2024)``.
    test_years : tuple
        Year range for testing, default ``(2025, 2025)``.
    patch_size : int or None
        If given, extract random spatial patches of this size during
        ``__getitem__``.  If ``None``, return the full spatial field.
    """

    def __init__(
        self,
        inputs_path: str | Path = "data/processed/inputs.nc",
        targets_path: str | Path = "data/processed/targets.nc",
        masks_path: str | Path | None = None,
        split: str = "train",
        train_years: tuple[int, int] = (2020, 2023),
        val_years: tuple[int, int] = (2024, 2024),
        test_years: tuple[int, int] = (2025, 2025),
        patch_size: int | None = None,
        channel_indices: list[int] | None = None,
    ):
        """channel_indices: indices of input channels to keep (default: first 7 physical channels)."""

        super().__init__()
        self.patch_size = patch_size
        self.split = split
        # Default: keep all 13 channels from the L4 pipeline
        self.channel_indices = channel_indices if channel_indices is not None else list(range(13))

        # Load data
        X = xr.open_dataarray(inputs_path)
        Y = xr.open_dataarray(targets_path)

        # Normalise dim order: L4 pipeline writes (channel, time, lat, lon)
        # but the rest of this class expects (time, channel, lat, lon).
        if X.dims[0] != "time":
            X = X.transpose("time", ...)

        # Apply temporal split
        if split != "all":
            year_range = {
                "train": train_years,
                "val":   val_years,
                "test":  test_years,
            }[split]
            time_mask = (
                (X.time.dt.year >= year_range[0])
                & (X.time.dt.year <= year_range[1])
            )
            X = X.sel(time=time_mask)
            Y = Y.sel(time=time_mask)

        # Convert to numpy arrays (materialise from disk)
        self.X = X.values.astype(np.float32)  # (T, C, H, W)
        self.Y = Y.values.astype(np.float32)  # (T, D, H, W)

        # Select requested input channels
        self.X = self.X[:, self.channel_indices, :, :]

        # Load masks if available
        self.masks = None
        if masks_path is not None and Path(masks_path).exists():
            masks_ds = xr.open_dataset(masks_path)
            # Stack mask variables into a single array
            mask_vars = [v for v in masks_ds.data_vars]
            if mask_vars:
                mask_list = []
                for v in mask_vars:
                    m = masks_ds[v]
                    if split != "all":
                        m = m.sel(time=time_mask)
                    mask_list.append(m.values.astype(np.float32))
                self.masks = np.stack(mask_list, axis=1)  # (T, M, H, W)

        # Replace any remaining NaN in targets with 0 and create target mask
        self.target_valid = np.isfinite(self.Y).astype(np.float32)
        self.X = np.nan_to_num(self.X, nan=0.0)
        self.Y = np.nan_to_num(self.Y, nan=0.0)

        self.n_times = self.X.shape[0]
        self.height = self.X.shape[2]
        self.width = self.X.shape[3]

    def __len__(self) -> int:
        return self.n_times

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        x = self.X[idx]  # (C, H, W)
        y = self.Y[idx]  # (D, H, W)
        y_mask = self.target_valid[idx]  # (D, H, W)

        # Optional spatial patch extraction
        if self.patch_size is not None and self.patch_size < min(self.height, self.width):
            h_start = np.random.randint(0, self.height - self.patch_size)
            w_start = np.random.randint(0, self.width - self.patch_size)
            h_end = h_start + self.patch_size
            w_end = w_start + self.patch_size

            x = x[:, h_start:h_end, w_start:w_end]
            y = y[:, h_start:h_end, w_start:w_end]
            y_mask = y_mask[:, h_start:h_end, w_start:w_end]

        sample = {
            "input":       torch.from_numpy(x),
            "target":      torch.from_numpy(y),
            "target_mask": torch.from_numpy(y_mask),
        }

        if self.masks is not None:
            m = self.masks[idx]
            if self.patch_size is not None and self.patch_size < min(self.height, self.width):
                m = m[:, h_start:h_end, w_start:w_end]
            sample["input_mask"] = torch.from_numpy(m)

        return sample


def create_dataloaders(
    inputs_path: str = "data/processed/inputs.nc",
    targets_path: str = "data/processed/targets.nc",
    masks_path: str = "data/processed/masks.nc",
    batch_size: int = 8,
    patch_size: int | None = 32,
    num_workers: int = 0,
) -> dict[str, torch.utils.data.DataLoader]:
    """Create train/val/test DataLoaders.

    Returns
    -------
    dict
        ``{"train": ..., "val": ..., "test": ...}`` DataLoaders.
    """
    loaders = {}
    for split in ("train", "val", "test"):
        ds = AntarBodhDataset(
            inputs_path=inputs_path,
            targets_path=targets_path,
            masks_path=masks_path,
            split=split,
            patch_size=patch_size,
        )
        loaders[split] = torch.utils.data.DataLoader(
            ds,
            batch_size=batch_size,
            shuffle=(split == "train"),
            num_workers=num_workers,
            pin_memory=True,
        )
    return loaders
