"""Unit tests for ANTARBODH preprocessing pipeline.

Uses small synthetic xarray datasets — does NOT require real 5-year data.
"""

import numpy as np
import pandas as pd
import pytest
import xarray as xr
from pathlib import Path
import sys

# Ensure repo root on path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from src.preprocessing.config import (
    PreprocessingConfig, QCThresholds, build_common_grid, validate_config,
    PHYSICAL_CHANNELS, MASK_CHANNELS, ALL_CHANNELS,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_config(**overrides) -> PreprocessingConfig:
    """Create a config with defaults suitable for testing."""
    defaults = dict(
        project_root=Path("/tmp/test"),
        raw_dir=Path("/tmp/test/data/raw"),
        processed_dir=Path("/tmp/test/data/processed"),
        outputs_dir=Path("/tmp/test/outputs"),
        figures_dir=Path("/tmp/test/outputs/figures"),
        reports_dir=Path("/tmp/test/outputs/reports"),
        min_lat=5.0, max_lat=20.0,
        min_lon=80.0, max_lon=100.0,
        grid_resolution=0.25,
        target_depths=[0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
        time_start="2020-01-01", time_end="2025-12-31",
        train_end_year=2023, val_year=2024, test_year=2025,
        qc=QCThresholds(),
        wind_min_hourly_obs_per_day=18,
    )
    defaults.update(overrides)
    return PreprocessingConfig(**defaults)


def _make_synthetic_surface(n_time=10, n_lat=60, n_lon=80):
    """Create synthetic surface dataset with 7 variables."""
    time = pd.date_range("2020-01-01", periods=n_time, freq="D")
    lat = np.linspace(5.125, 19.875, n_lat)
    lon = np.linspace(80.125, 99.875, n_lon)

    rng = np.random.RandomState(42)
    shape = (n_time, n_lat, n_lon)

    ds = xr.Dataset({
        "SST": xr.DataArray(rng.randn(*shape) * 2 + 28, dims=["time", "latitude", "longitude"]),
        "SSS": xr.DataArray(rng.randn(*shape) * 1 + 33, dims=["time", "latitude", "longitude"]),
        "SSH": xr.DataArray(rng.randn(*shape) * 0.1, dims=["time", "latitude", "longitude"]),
        "Current_U": xr.DataArray(rng.randn(*shape) * 0.3, dims=["time", "latitude", "longitude"]),
        "Current_V": xr.DataArray(rng.randn(*shape) * 0.2, dims=["time", "latitude", "longitude"]),
        "Wind_U": xr.DataArray(rng.randn(*shape) * 4, dims=["time", "latitude", "longitude"]),
        "Wind_V": xr.DataArray(rng.randn(*shape) * 3.5, dims=["time", "latitude", "longitude"]),
    }, coords={"time": time, "latitude": lat, "longitude": lon})

    # Add some NaN to simulate missing observations
    if n_time > 3:
        ds["SSS"].values[3:min(5, n_time), :, :] = np.nan  # Missing SSS
    if n_time > 7:
        ds["Wind_U"].values[7, 10:20, 30:40] = np.nan  # Partial wind gap

    return ds


def _make_synthetic_target(n_time=10, n_lat=60, n_lon=80, n_depth=15):
    """Create synthetic GLORYS target."""
    time = pd.date_range("2020-01-01", periods=n_time, freq="D")
    lat = np.linspace(5.125, 19.875, n_lat)
    lon = np.linspace(80.125, 99.875, n_lon)
    depth = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]

    rng = np.random.RandomState(123)
    shape = (n_time, n_depth, n_lat, n_lon)

    data = rng.randn(*shape) * 3 + 20

    # Simulate land mask (a rectangular land area)
    data[:, :, 0:5, 0:5] = np.nan

    thetao = xr.DataArray(
        data, dims=["time", "depth", "latitude", "longitude"],
        coords={"time": time, "latitude": lat, "longitude": lon, "depth": depth},
        name="thetao",
    )
    return thetao


# =============================================================================
# TEST: build_common_grid
# =============================================================================

class TestBuildCommonGrid:
    """Tests for the cell-centered grid construction."""

    def test_prototype_grid_dimensions(self):
        """Grid should be exactly 60 lat × 80 lon."""
        cfg = _make_config()
        lat, lon = build_common_grid(cfg)
        assert len(lat) == 60
        assert len(lon) == 80

    def test_prototype_grid_centers(self):
        """First/last centers should be edge + res/2."""
        cfg = _make_config()
        lat, lon = build_common_grid(cfg)

        assert abs(float(lat.values[0]) - 5.125) < 1e-6
        assert abs(float(lat.values[-1]) - 19.875) < 1e-6
        assert abs(float(lon.values[0]) - 80.125) < 1e-6
        assert abs(float(lon.values[-1]) - 99.875) < 1e-6

    def test_prototype_grid_spacing(self):
        """Spacing should be exactly 0.25°."""
        cfg = _make_config()
        lat, lon = build_common_grid(cfg)

        lat_spacing = np.diff(lat.values)
        lon_spacing = np.diff(lon.values)
        assert np.allclose(lat_spacing, 0.25, atol=1e-6)
        assert np.allclose(lon_spacing, 0.25, atol=1e-6)

    def test_different_domain(self):
        """Grid construction should work for different domains."""
        cfg = _make_config(min_lat=0.0, max_lat=10.0, min_lon=50.0, max_lon=60.0)
        lat, lon = build_common_grid(cfg)

        assert len(lat) == 40
        assert len(lon) == 40
        assert abs(float(lat.values[0]) - 0.125) < 1e-6
        assert abs(float(lon.values[0]) - 50.125) < 1e-6


# =============================================================================
# TEST: Channel assembly
# =============================================================================

class TestChannelAssembly:
    """Tests for the 14-channel tensor construction."""

    def test_exactly_14_channels(self):
        """Channel list must be exactly 14."""
        assert len(ALL_CHANNELS) == 14

    def test_channel_names_correct(self):
        """Physical + mask channel names must be in exact order."""
        expected = [
            "SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V",
            "SST_mask", "SSS_mask", "SSH_mask",
            "Current_U_mask", "Current_V_mask", "Wind_U_mask", "Wind_V_mask",
        ]
        assert ALL_CHANNELS == expected

    def test_mask_channels_derived_from_physical(self):
        """Each mask channel should be {physical}_mask."""
        for phys, mask in zip(PHYSICAL_CHANNELS, MASK_CHANNELS):
            assert mask == f"{phys}_mask"

    def test_channel_assembly_integration(self):
        """Test that channel assembly produces correct shape and names."""
        surface = _make_synthetic_surface(n_time=5)

        X_da = xr.concat([surface[var] for var in PHYSICAL_CHANNELS], dim="channel")
        X_da = X_da.assign_coords(channel=PHYSICAL_CHANNELS)

        X_mask = X_da.notnull().astype(np.float32)
        X_mask = X_mask.assign_coords(channel=MASK_CHANNELS)

        combined = xr.concat([X_da, X_mask], dim="channel")

        assert combined.sizes["channel"] == 14
        assert list(combined.channel.values) == ALL_CHANNELS


# =============================================================================
# TEST: Normalization
# =============================================================================

class TestNormalization:
    """Tests for train-only normalization logic."""

    def test_train_only_normalization(self):
        """Normalization must use only training data statistics."""
        surface = _make_synthetic_surface(n_time=100)

        X = xr.concat([surface[var] for var in PHYSICAL_CHANNELS], dim="channel")
        X = X.assign_coords(channel=PHYSICAL_CHANNELS)

        # Split: first 70 train, last 30 val
        X_train = X.isel(time=slice(0, 70))
        X_val = X.isel(time=slice(70, 100))

        train_mean = X_train.mean(dim=["time", "latitude", "longitude"], skipna=True)
        train_std = X_train.std(dim=["time", "latitude", "longitude"], skipna=True)

        X_train_norm = ((X_train - train_mean) / train_std).fillna(0.0)

        # Train normalized physical channels should have mean ≈ 0 for valid obs
        for i, ch in enumerate(PHYSICAL_CHANNELS):
            ch_data = X_train_norm.sel(channel=ch).values
            mask = X_train.sel(channel=ch).notnull().values
            valid = ch_data[mask]
            if len(valid) > 0:
                assert abs(np.mean(valid)) < 0.1, f"{ch} mean should be near 0"

    def test_masks_not_normalized(self):
        """Mask channels must remain 0/1, never normalized."""
        surface = _make_synthetic_surface(n_time=5)

        X = xr.concat([surface[var] for var in PHYSICAL_CHANNELS], dim="channel")
        X_mask = X.notnull().astype(np.float32)

        unique_vals = np.unique(X_mask.values)
        assert set(unique_vals).issubset({0.0, 1.0})


# =============================================================================
# TEST: Masks
# =============================================================================

class TestMasks:
    """Tests for mask validity."""

    def test_masks_binary(self):
        """Masks must contain only 0 and 1."""
        surface = _make_synthetic_surface(n_time=5)

        for var in PHYSICAL_CHANNELS:
            mask = surface[var].notnull().astype(np.float32)
            unique = np.unique(mask.values)
            assert set(unique).issubset({0.0, 1.0}), f"{var} mask not binary"

    def test_mask_nan_consistency(self):
        """Where data is NaN, mask should be 0."""
        surface = _make_synthetic_surface(n_time=5)

        for var in PHYSICAL_CHANNELS:
            data = surface[var].values
            mask = np.isfinite(data).astype(np.float32)

            nan_positions = np.isnan(data)
            assert np.all(mask[nan_positions] == 0.0)

            valid_positions = np.isfinite(data)
            assert np.all(mask[valid_positions] == 1.0)


# =============================================================================
# TEST: Target depths
# =============================================================================

class TestTargetDepths:
    """Tests for GLORYS target depth specification."""

    def test_exactly_15_depths(self):
        """Must have exactly 15 target depths."""
        cfg = _make_config()
        assert len(cfg.target_depths) == 15

    def test_depth_ordering(self):
        """Depths must be sorted ascending."""
        cfg = _make_config()
        assert cfg.target_depths == sorted(cfg.target_depths)

    def test_depth_values(self):
        """Must match exact specification."""
        cfg = _make_config()
        expected = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]
        assert cfg.target_depths == expected


# =============================================================================
# TEST: Chronological split
# =============================================================================

class TestChronologicalSplit:
    """Tests for temporal splitting."""

    def test_split_years(self):
        """Train ≤2023, Val=2024, Test=2025."""
        time = pd.date_range("2020-01-01", "2025-12-31", freq="D")
        years = time.year

        train_mask = years <= 2023
        val_mask = years == 2024
        test_mask = years == 2025

        assert train_mask.sum() == 1461  # 4 years (2020 is leap)
        assert val_mask.sum() == 366     # 2024 is leap
        assert test_mask.sum() == 365    # 2025

        # No overlap
        assert not np.any(train_mask & val_mask)
        assert not np.any(train_mask & test_mask)
        assert not np.any(val_mask & test_mask)

        # Complete coverage
        assert np.all(train_mask | val_mask | test_mask)


# =============================================================================
# TEST: Wind resampling
# =============================================================================

class TestWindResampling:
    """Tests for hourly→daily wind resampling with coverage control."""

    def test_incomplete_day_masked(self):
        """Day with fewer than threshold valid hours should be NaN."""
        from src.preprocessing.qc import _resample_hourly_winds

        # Create 2 days of hourly data
        time = pd.date_range("2020-01-01", periods=48, freq="h")
        data = np.ones((48, 3, 3))

        # Day 1: all 24 valid, Day 2: only 5 valid
        data[24:43, :, :] = np.nan  # hours 0-18 of day 2 are NaN

        wind = xr.DataArray(
            data, dims=["time", "latitude", "longitude"],
            coords={"time": time, "latitude": [1, 2, 3], "longitude": [1, 2, 3]},
        )

        daily = _resample_hourly_winds(wind, min_obs_per_day=18)

        # Day 1 should be valid (24 obs)
        assert np.isfinite(daily.values[0, 0, 0])

        # Day 2 should be NaN (only 5 valid obs)
        assert np.isnan(daily.values[1, 0, 0])

    def test_sufficient_coverage_passes(self):
        """Day with exactly threshold valid hours should be valid."""
        from src.preprocessing.qc import _resample_hourly_winds

        time = pd.date_range("2020-01-01", periods=24, freq="h")
        data = np.ones((24, 2, 2))
        data[18:, :, :] = np.nan  # 18 valid, 6 NaN

        wind = xr.DataArray(
            data, dims=["time", "latitude", "longitude"],
            coords={"time": time, "latitude": [1, 2], "longitude": [1, 2]},
        )

        daily = _resample_hourly_winds(wind, min_obs_per_day=18)
        assert np.isfinite(daily.values[0, 0, 0])


# =============================================================================
# TEST: Config validation
# =============================================================================

class TestConfigValidation:
    """Tests for configuration validation."""

    def test_valid_config_passes(self):
        """Default config should pass validation."""
        cfg = _make_config()
        validate_config(cfg)  # Should not raise

    def test_invalid_lat_range(self):
        """min_lat >= max_lat should fail."""
        cfg = _make_config(min_lat=20.0, max_lat=5.0)
        with pytest.raises(AssertionError, match="min_lat"):
            validate_config(cfg)

    def test_invalid_lon_range(self):
        """min_lon >= max_lon should fail."""
        cfg = _make_config(min_lon=100.0, max_lon=80.0)
        with pytest.raises(AssertionError, match="min_lon"):
            validate_config(cfg)

    def test_invalid_resolution(self):
        """resolution <= 0 should fail."""
        cfg = _make_config(grid_resolution=-0.25)
        with pytest.raises(AssertionError, match="grid_resolution"):
            validate_config(cfg)

    def test_invalid_split_years(self):
        """train_end_year >= val_year should fail."""
        cfg = _make_config(train_end_year=2025, val_year=2024)
        with pytest.raises(AssertionError, match="train_end_year"):
            validate_config(cfg)

    def test_unsorted_depths(self):
        """Unsorted depths should fail."""
        cfg = _make_config(target_depths=[0, 10, 5, 20])
        with pytest.raises(AssertionError, match="sorted"):
            validate_config(cfg)

    def test_negative_depth(self):
        """Negative depths should fail."""
        cfg = _make_config(target_depths=[-1, 0, 5, 10])
        with pytest.raises(AssertionError, match=">= 0"):
            validate_config(cfg)

    def test_invalid_wind_threshold(self):
        """Wind threshold outside 1-24 should fail."""
        cfg = _make_config(wind_min_hourly_obs_per_day=0)
        with pytest.raises(AssertionError, match="wind_min_hourly_obs_per_day"):
            validate_config(cfg)


# =============================================================================
# TEST: Extrapolation prevention
# =============================================================================

class TestExtrapolation:
    """Tests that spatial extrapolation is prevented."""

    def test_regrid_raises_on_extrapolation(self):
        """Should raise ValueError if target grid is outside source grid."""
        from src.preprocessing.regrid import _verify_no_extrapolation

        # Source: 5 to 10
        src_lat = np.array([5.0, 10.0])
        src_lon = np.array([80.0, 85.0])

        # Target: 0 to 10 (exceeds min_lat)
        tgt_lat = np.array([0.0, 10.0])
        tgt_lon = np.array([80.0, 85.0])

        with pytest.raises(ValueError, match="target lat min"):
            _verify_no_extrapolation("Test", src_lat, src_lon, tgt_lat, tgt_lon)

        # Target: 5 to 15 (exceeds max_lat)
        tgt_lat = np.array([5.0, 15.0])
        with pytest.raises(ValueError, match="target lat max"):
            _verify_no_extrapolation("Test", src_lat, src_lon, tgt_lat, tgt_lon)


# =============================================================================
# TEST: Integration (SSS Gap Handling)
# =============================================================================

class TestIntegration:
    """End-to-end builder tests, especially for missing SSS handling."""

    def test_sss_gap_preserves_timeline(self):
        """
        If SSS ends in 2024, the pipeline MUST preserve 2025 in the output.
        2025 SSS should be fill_value (0.0 after normalization) and SSS_mask=0.
        """
        from src.preprocessing.builder import build_and_save_ml_datasets

        cfg = _make_config()
        # Create a canonical time axis for 2020-2025 (2192 days)
        canonical_time = pd.date_range("2020-01-01", "2025-12-31", freq="D")
        n_time = len(canonical_time)
        n_lat, n_lon = 60, 80

        # Build surface dataset
        surface_common = _make_synthetic_surface(n_time=n_time, n_lat=n_lat, n_lon=n_lon)
        surface_common = surface_common.assign_coords(time=canonical_time)

        # Simulate SSS dropping out after 2024-12-15
        gap_start = pd.Timestamp("2024-12-16")
        surface_common["SSS"].loc[{"time": slice(gap_start, None)}] = np.nan

        # Build target dataset
        thetao_common = _make_synthetic_target(n_time=n_time, n_lat=n_lat, n_lon=n_lon, n_depth=15)
        thetao_common = thetao_common.assign_coords(time=canonical_time)

        # Run builder
        train_ds, val_ds, test_ds, norm_stats = build_and_save_ml_datasets(
            surface_common, thetao_common, cfg
        )

        # Verify timelines are NOT truncated
        assert train_ds.sizes["time"] == 1461  # 2020-2023
        assert val_ds.sizes["time"] == 366     # 2024 (leap year)
        assert test_ds.sizes["time"] == 365    # 2025

        # Verify 2025 SSS is correctly masked and filled
        sss_idx = PHYSICAL_CHANNELS.index("SSS")
        sss_mask_idx = ALL_CHANNELS.index("SSS_mask")

        # Test set (all of 2025) should have exactly 0 valid SSS cells in the raw data
        # which means the mask channel should be entirely 0.0
        test_sss_mask = test_ds.X.isel(channel=sss_mask_idx).values
        assert np.all(test_sss_mask == 0.0)

        # Test set SSS channel (normalized/filled) should be exactly 0.0
        test_sss_data = test_ds.X.isel(channel=sss_idx).values
        assert np.all(test_sss_data == 0.0)

        # Verify other channels (e.g. SST) are still present in 2025
        sst_idx = PHYSICAL_CHANNELS.index("SST")
        test_sst_mask = test_ds.X.isel(channel=ALL_CHANNELS.index("SST_mask")).values
        assert np.any(test_sst_mask == 1.0)  # Should have valid SST


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
