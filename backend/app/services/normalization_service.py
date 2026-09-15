import xarray as xr
import numpy as np
from pathlib import Path
from ..config import settings

class NormalizationService:
    def __init__(self):
        self._stats = None
        self._mean = None
        self._std = None

    def _load(self):
        if self._stats is None:
            if not settings.normalization_stats_path.exists():
                raise FileNotFoundError(f"Normalization stats not found at {settings.normalization_stats_path}")
            self._stats = xr.open_dataset(settings.normalization_stats_path)
            self._mean = self._stats.train_mean.values
            self._std = self._stats.train_std.values

    def normalize(self, physical_channels: np.ndarray, channel_names: list[str]) -> np.ndarray:
        """
        Normalize the 7 physical channels using the training mean and standard deviation.
        Missing values (np.nan) will be preserved as nan here.
        
        Args:
            physical_channels: shape (7, H, W)
            channel_names: exactly the 7 physical channel names
            
        Returns:
            np.ndarray: Normalized array of same shape
        """
        self._load()
        
        expected_channels = list(self._stats.channel.values)
        if channel_names != expected_channels:
            raise ValueError(f"Channel order mismatch. Expected {expected_channels}, got {channel_names}")
            
        mean_expanded = self._mean[:, np.newaxis, np.newaxis]
        std_expanded = self._std[:, np.newaxis, np.newaxis]
        
        normalized = (physical_channels - mean_expanded) / std_expanded
        
        return normalized

normalization_service = NormalizationService()
