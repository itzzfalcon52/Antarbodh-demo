"""
ANTARBODH inference normalization.

Uses ONLY statistics calculated from the training split.

This service is deliberately separate from the training preprocessing
pipeline. It reproduces the final transformation used by builder.py:

    normalized = (X - train_mean) / train_std
    missing values -> 0
    append validity masks

Result:

    14 channels
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import xarray as xr

from ..config import settings


class NormalizationService:

    PHYSICAL_CHANNELS = [
        "SST",
        "SSS",
        "SSH",
        "Current_U",
        "Current_V",
        "Wind_U",
        "Wind_V",
    ]

    MASK_CHANNELS = [
        f"{channel}_mask"
        for channel in PHYSICAL_CHANNELS
    ]

    ALL_CHANNELS = PHYSICAL_CHANNELS + MASK_CHANNELS

    def __init__(
        self,
        normalization_stats_path: Path,
    ) -> None:

        self.path = Path(normalization_stats_path)

        if not self.path.exists():
            raise FileNotFoundError(
                "Normalization statistics not found: "
                f"{self.path}"
            )

        self.train_mean: np.ndarray
        self.train_std: np.ndarray

        self._load()

    def _load(self) -> None:

        with xr.open_dataset(
            self.path,
            cache=False,
        ) as ds:

            if "train_mean" not in ds:
                raise RuntimeError(
                    "normalization_stats.nc is missing 'train_mean'."
                )

            if "train_std" not in ds:
                raise RuntimeError(
                    "normalization_stats.nc is missing 'train_std'."
                )

            mean_da = ds["train_mean"]
            std_da = ds["train_std"]

            if "channel" not in mean_da.dims:
                raise RuntimeError(
                    "'train_mean' must contain a channel dimension."
                )

            if "channel" not in std_da.dims:
                raise RuntimeError(
                    "'train_std' must contain a channel dimension."
                )

            channels = [
                str(value)
                for value in mean_da["channel"].values
            ]

            if channels != self.PHYSICAL_CHANNELS:
                raise RuntimeError(
                    "Normalization channel order does not match "
                    "the trained model.\n"
                    f"Expected: {self.PHYSICAL_CHANNELS}\n"
                    f"Found:    {channels}"
                )

            self.train_mean = np.asarray(
                mean_da.values,
                dtype=np.float32,
            )

            self.train_std = np.asarray(
                std_da.values,
                dtype=np.float32,
            )

        # -------------------------------------------------------------
        # Safety checks
        # -------------------------------------------------------------

        if self.train_mean.shape != (7,):
            raise RuntimeError(
                f"Invalid train_mean shape: "
                f"{self.train_mean.shape}"
            )

        if self.train_std.shape != (7,):
            raise RuntimeError(
                f"Invalid train_std shape: "
                f"{self.train_std.shape}"
            )

        if not np.all(np.isfinite(self.train_mean)):
            raise RuntimeError(
                "Training normalization means contain "
                "non-finite values."
            )

        if not np.all(np.isfinite(self.train_std)):
            raise RuntimeError(
                "Training normalization std values contain "
                "non-finite values."
            )

        if np.any(self.train_std <= 0):
            raise RuntimeError(
                "Training normalization std must be positive."
            )

    def transform(
        self,
        physical_array: np.ndarray,
        missing_masks: np.ndarray,
    ) -> np.ndarray:
        """
        Convert seven physical fields + seven masks into the exact
        fourteen-channel CNN input.

        Input
        -----
        physical_array:
            (7, H, W)

        missing_masks:
            (7, H, W)

        Output
        ------
        model_input:
            (14, H, W)
        """

        physical_array = np.asarray(
            physical_array,
            dtype=np.float32,
        )

        missing_masks = np.asarray(
            missing_masks,
            dtype=np.float32,
        )

        if physical_array.ndim != 3:
            raise ValueError(
                "physical_array must have shape (7,H,W); "
                f"got {physical_array.shape}"
            )

        if physical_array.shape[0] != 7:
            raise ValueError(
                "Expected 7 physical channels; "
                f"got {physical_array.shape[0]}"
            )

        if missing_masks.shape != physical_array.shape:
            raise ValueError(
                "missing_masks must have the same shape as "
                f"physical_array; got "
                f"{missing_masks.shape} vs "
                f"{physical_array.shape}"
            )

        # -------------------------------------------------------------
        # Same transformation used during training:
        #
        #     (X - train_mean) / train_std
        #
        # Broadcast statistics over H/W.
        # -------------------------------------------------------------

        normalized = (
            physical_array
            - self.train_mean[:, None, None]
        ) / self.train_std[:, None, None]

        # -------------------------------------------------------------
        # Missing values are filled AFTER normalization.
        #
        # This matches builder.py.
        # -------------------------------------------------------------

        normalized = np.where(
            np.isfinite(normalized),
            normalized,
            0.0,
        ).astype(np.float32)

        # -------------------------------------------------------------
        # Masks remain explicit channels.
        # -------------------------------------------------------------

        masks = np.nan_to_num(
            missing_masks,
            nan=0.0,
            posinf=0.0,
            neginf=0.0,
        ).astype(np.float32)

        masks = np.clip(
            masks,
            0.0,
            1.0,
        )

        model_input = np.concatenate(
            [
                normalized,
                masks,
            ],
            axis=0,
        ).astype(np.float32)

        # -------------------------------------------------------------
        # Final contract
        # -------------------------------------------------------------

        if model_input.shape[0] != 14:
            raise RuntimeError(
                f"Model input must contain exactly 14 channels; "
                f"got {model_input.shape[0]}"
            )

        if not np.all(np.isfinite(model_input)):
            raise RuntimeError(
                "Model input contains non-finite values."
            )

        return model_input


normalization_service = NormalizationService(settings.normalization_stats_path)