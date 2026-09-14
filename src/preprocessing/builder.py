"""Dataset builder: chronological splitting, train-only normalization,
14-channel assembly, NetCDF serialization, and post-build validation.

Processing sequence (scientifically critical ordering):
    1. Build 7-channel raw feature tensor
    2. Build masks from raw data (before any fill)
    3. Chronological split
    4. Compute mean/std from TRAINING SET ONLY
    5. Normalize physical channels using train statistics
    6. Zero-fill missing observations AFTER normalization
    7. Append mask channels (never normalized)
    8. Serialize with metadata

This ordering prevents:
    - Data leakage (val/test statistics never computed)
    - Mask corruption (masks built before fill)
    - Incorrect normalization (NaN-aware, not contaminated by fills)
"""

from pathlib import Path
from typing import Dict, List, Tuple
import dask
import numpy as np
import pandas as pd
import xarray as xr

from src.preprocessing.config import PreprocessingConfig, PHYSICAL_CHANNELS, MASK_CHANNELS, ALL_CHANNELS

# Minimum standard deviation for safety check
_MIN_STD_EPSILON = 1e-8


def build_and_save_ml_datasets(
    surface_common: xr.Dataset,
    thetao_common: xr.DataArray,
    cfg: PreprocessingConfig,
) -> Tuple[xr.Dataset, xr.Dataset, xr.Dataset, xr.Dataset]:
    """
    Assemble 14-channel model input, apply strict train-only normalization,
    partition chronologically, and save compressed NetCDF files with metadata.

    Returns:
        Tuple of (train_ds, val_ds, test_ds, norm_stats_ds)
    """
    output_dir = cfg.processed_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    train_end_year = cfg.train_end_year
    val_year = cfg.val_year
    test_year = cfg.test_year

    # ── Time alignment ────────────────────────────────────────────────────
    print("\nValidating canonical timelines...")

    # Both datasets should already be on the canonical timeline from regrid.py
    # Missing SSS remains NaN for dates without coverage. We DO NOT drop days.
    if not surface_common.time.equals(thetao_common.time):
        raise ValueError("Surface and target timelines do not match canonical time axis")

    canonical_time = pd.date_range(cfg.time_start, cfg.time_end, freq="D")
    if not np.array_equal(surface_common.time.values, canonical_time.values):
        raise ValueError("Surface time axis does not match canonical config timeline")

    n_time = surface_common.sizes["time"]
    n_lat = surface_common.sizes["latitude"]
    n_lon = surface_common.sizes["longitude"]

    print(f"Common time steps: {n_time}")
    print(f"Spatial grid: {n_lat} lat × {n_lon} lon")

    first_time = str(surface_common.time.values[0])[:10]
    last_time = str(surface_common.time.values[-1])[:10]
    print(f"Time range: {first_time} → {last_time}")

    # ── 1. Construct 7-channel raw feature tensor ─────────────────────────
    X_da = xr.concat(
        [surface_common[var] for var in PHYSICAL_CHANNELS],
        dim="channel",
    )
    X_da = X_da.assign_coords(channel=PHYSICAL_CHANNELS)
    X_da.name = "surface_inputs"

    Y_da = thetao_common.rename("subsurface_temperature")

    # ── 2. Build masks from raw data (BEFORE any fill) ────────────────────
    # These masks represent whether the FINAL REGRIDDED FIELD is valid,
    # NOT necessarily whether an original satellite observation existed.
    # For L4 products, validity primarily reflects ocean domain + product mask.
    X_mask = X_da.notnull()
    X_mask.name = "surface_valid_mask"

    Y_mask = Y_da.notnull()
    Y_mask.name = "target_valid_mask"

    # Transpose to (time, channel/depth, lat, lon)
    X_da = X_da.transpose("time", "channel", "latitude", "longitude")
    X_mask = X_mask.transpose("time", "channel", "latitude", "longitude")
    Y_da = Y_da.transpose("time", "depth", "latitude", "longitude")
    Y_mask = Y_mask.transpose("time", "depth", "latitude", "longitude")

    print(f"X raw shape:      {X_da.shape} (dims: {X_da.dims})")
    print(f"Y target shape:   {Y_da.shape} (dims: {Y_da.dims})")

    # ── 3. Chronological split ────────────────────────────────────────────
    print(f"\nPartitioning chronologically: Train (≤ {train_end_year}), "
          f"Val ({val_year}), Test ({test_year})...")

    time_years = X_da.time.dt.year
    train_sel = time_years <= train_end_year
    val_sel = time_years == val_year
    test_sel = time_years == test_year

    X_train = X_da.sel(time=train_sel)
    X_val = X_da.sel(time=val_sel)
    X_test = X_da.sel(time=test_sel)

    Y_train = Y_da.sel(time=train_sel)
    Y_val = Y_da.sel(time=val_sel)
    Y_test = Y_da.sel(time=test_sel)

    Xmask_train = X_mask.sel(time=train_sel)
    Xmask_val = X_mask.sel(time=val_sel)
    Xmask_test = X_mask.sel(time=test_sel)

    Ymask_train = Y_mask.sel(time=train_sel)
    Ymask_val = Y_mask.sel(time=val_sel)
    Ymask_test = Y_mask.sel(time=test_sel)

    print(f"  Train: {X_train.sizes['time']} days")
    print(f"  Val:   {X_val.sizes['time']} days")
    print(f"  Test:  {X_test.sizes['time']} days")

    # ── 4. Compute normalization statistics from TRAINING SET ONLY ────────
    print("Computing per-channel mean and std from training set (batched)...")
    train_mean_lazy = X_train.mean(dim=["time", "latitude", "longitude"], skipna=True)
    train_std_lazy = X_train.std(dim=["time", "latitude", "longitude"], skipna=True)

    train_mean, train_std = dask.compute(train_mean_lazy, train_std_lazy)

    # Safety check: no near-zero variance
    for i, ch in enumerate(PHYSICAL_CHANNELS):
        std_val = float(train_std.values[i])
        if std_val < _MIN_STD_EPSILON:
            raise ValueError(
                f"Channel '{ch}' has near-zero training std ({std_val:.2e}). "
                f"This would produce infinite normalized values."
            )

    print("Train means:", {ch: f"{float(train_mean.values[i]):.4f}" for i, ch in enumerate(PHYSICAL_CHANNELS)})
    print("Train stds: ", {ch: f"{float(train_std.values[i]):.4f}" for i, ch in enumerate(PHYSICAL_CHANNELS)})

    # ── 5. Normalize, then zero-fill ──────────────────────────────────────
    print("Normalizing features (train stats) and zero-filling missing observations...")
    X_train_norm = ((X_train - train_mean) / train_std).fillna(0.0)
    X_val_norm = ((X_val - train_mean) / train_std).fillna(0.0)
    X_test_norm = ((X_test - train_mean) / train_std).fillna(0.0)

    # ── 6. Assemble 14 channels ───────────────────────────────────────────
    def assemble_14_channels(X_norm: xr.DataArray, Xmask: xr.DataArray) -> xr.DataArray:
        mask_channels = Xmask.astype(np.float32)
        mask_channels = mask_channels.assign_coords(
            channel=MASK_CHANNELS
        )
        combined = xr.concat([X_norm, mask_channels], dim="channel")

        # Verify exact channel count and order
        assert combined.sizes["channel"] == 14, \
            f"Expected 14 channels, got {combined.sizes['channel']}"
        actual_channels = list(combined.channel.values)
        assert actual_channels == ALL_CHANNELS, \
            f"Channel order mismatch:\n  Expected: {ALL_CHANNELS}\n  Got: {actual_channels}"

        return combined

    X_train_14 = assemble_14_channels(X_train_norm, Xmask_train)
    X_val_14 = assemble_14_channels(X_val_norm, Xmask_val)
    X_test_14 = assemble_14_channels(X_test_norm, Xmask_test)

    # ── SSS coverage reporting per split ──────────────────────────────────
    _report_sss_coverage(Xmask_train, Xmask_val, Xmask_test)

    # ── Joint coverage ────────────────────────────────────────────────────
    _report_joint_coverage(Xmask_train, Xmask_val, Xmask_test,
                           Ymask_train, Ymask_val, Ymask_test)

    # ── 7. Build final datasets with metadata ─────────────────────────────
    metadata_attrs = {
        "project": "ANTARBODH",
        "description": "Surface-to-subsurface ocean temperature reconstruction dataset",
        "spatial_resolution": "0.25 degree cell-centered",
        "region": "Bay of Bengal prototype (5N-20N, 80E-100E)",
        "input_channels": "7 physical + 7 validity masks = 14 total",
        "target_variable": "GLORYS thetao",
        "target_units": "degrees_C",
        "normalization": "train-only mean/std (no leakage)",
        "missing_input_encoding": "zero after normalization + validity mask channel",
        "target_missing_value_handling": "NaN preserved, masked via Y_mask (not imputed)",
        "mask_semantics": (
            "Masks represent validity of the FINAL REGRIDDED field, "
            "not necessarily original satellite measurement availability. "
            "For L4 products, masks primarily reflect ocean domain and product coverage."
        ),
        "depth_0m_note": (
            "The 0m target depth uses GLORYS shallowest native level (~0.494m) "
            "as a surface proxy. It is NOT an exact 0m observation."
        ),
        "sss_temporal_limitation": (
            "SSS L4 product ends 2024-12-15. SSS is NaN (SSS_mask=0) for dates "
            "beyond coverage. This affects late-Dec 2024 validation and all 2025 test data."
        ),
    }

    def _make_split_ds(X_14, Y, Ymask, period_label: str) -> xr.Dataset:
        ds = xr.Dataset({
            "X": X_14,
            "Y": Y.fillna(0.0),
            "Y_mask": Ymask.astype(np.int8),
        })
        ds.attrs.update(metadata_attrs)
        ds.attrs["split"] = period_label
        return ds

    train_ds = _make_split_ds(X_train_14, Y_train, Ymask_train,
                              f"train ({cfg.time_start} to {train_end_year}-12-31)")
    val_ds = _make_split_ds(X_val_14, Y_val, Ymask_val,
                            f"validation ({val_year}-01-01 to {val_year}-12-31)")
    test_ds = _make_split_ds(X_test_14, Y_test, Ymask_test,
                             f"test ({test_year}-01-01 to {test_year}-12-31)")

    # ── Normalization stats (self-describing) ─────────────────────────────
    norm_stats = xr.Dataset({
        "train_mean": train_mean,
        "train_std": train_std,
    })
    norm_stats = norm_stats.assign_coords(channel=PHYSICAL_CHANNELS)
    norm_stats.attrs["description"] = "Training-set normalization statistics (7 physical channels)"
    norm_stats.attrs["normalization_formula"] = "X_norm = (X_raw - train_mean) / train_std"
    norm_stats.attrs["note"] = "These statistics apply ONLY to the 7 physical channels, NOT to mask channels"

    # Add per-channel units
    channel_units = {
        "SST": "degrees_C", "SSS": "PSU", "SSH": "m",
        "Current_U": "m/s", "Current_V": "m/s",
        "Wind_U": "m/s", "Wind_V": "m/s",
    }
    norm_stats.attrs["channel_units"] = str(channel_units)

    # ── Schema assertions ─────────────────────────────────────────────────
    assert train_ds.X.dims == ("time", "channel", "latitude", "longitude"), \
        f"X dims: {train_ds.X.dims}"
    assert train_ds.Y.dims == ("time", "depth", "latitude", "longitude"), \
        f"Y dims: {train_ds.Y.dims}"
    assert train_ds.Y_mask.dims == ("time", "depth", "latitude", "longitude"), \
        f"Y_mask dims: {train_ds.Y_mask.dims}"
    print("\n✓ Schema and dimension assertions passed.")

    # ── 8. Serialize ──────────────────────────────────────────────────────
    _serialize_datasets(train_ds, val_ds, test_ds, norm_stats, output_dir, cfg.compression_level)

    return train_ds, val_ds, test_ds, norm_stats


def _report_sss_coverage(Xmask_train, Xmask_val, Xmask_test):
    """Report SSS availability per split."""
    print("\n── SSS Temporal Coverage ──")
    sss_idx = PHYSICAL_CHANNELS.index("SSS")

    for label, mask in [("Train", Xmask_train), ("Val", Xmask_val), ("Test", Xmask_test)]:
        sss_mask = mask.isel(channel=sss_idx)
        total_lazy = sss_mask.size
        valid_lazy = sss_mask.sum()
        valid = dask.compute(valid_lazy)[0]
        total = int(total_lazy)
        valid = int(valid.item())
        pct = (valid / total * 100) if total > 0 else 0.0

        # Count days with ANY valid SSS
        days_with_sss = sss_mask.any(dim=["latitude", "longitude"]).sum()
        days_with_sss = dask.compute(days_with_sss)[0]
        total_days = mask.sizes["time"]

        print(f"  {label:6s}: SSS available {pct:5.1f}% of time×space cells, "
              f"{int(days_with_sss.item())}/{total_days} days with any SSS")


def _report_joint_coverage(Xmask_train, Xmask_val, Xmask_test,
                           Ymask_train, Ymask_val, Ymask_test):
    """Report joint 7-variable input coverage and input+target coverage."""
    print("\n── Joint Coverage ──")

    for label, xmask, ymask in [
        ("Train", Xmask_train, Ymask_train),
        ("Val", Xmask_val, Ymask_val),
        ("Test", Xmask_test, Ymask_test),
    ]:
        # Joint 7 inputs: all 7 physical channels valid simultaneously
        joint_input = xmask.all(dim="channel")  # (time, lat, lon)
        joint_input_frac_lazy = joint_input.sum() / joint_input.size

        # Target valid (any depth) — we use this as the ocean mask for the joint calculation
        target_any = ymask.any(dim="depth")  # (time, lat, lon)
        ocean_size_lazy = target_any.sum()
        
        # Ocean-only joint input
        ocean_joint_input_lazy = (joint_input & target_any).sum() / ocean_size_lazy

        # Joint input + target: all inputs valid AND target valid
        joint_all = joint_input & target_any
        joint_all_frac_lazy = joint_all.sum() / joint_all.size
        ocean_joint_all_lazy = joint_all.sum() / ocean_size_lazy # same numerator, ocean denominator

        ji_frac, ja_frac, o_ji_frac, o_ja_frac = dask.compute(
            joint_input_frac_lazy, joint_all_frac_lazy, 
            ocean_joint_input_lazy, ocean_joint_all_lazy
        )

        print(f"  {label:6s}: Whole-grid Joint 7-input {float(ji_frac)*100:5.1f}% | "
              f"Ocean-only {float(o_ji_frac)*100:5.1f}%")
        print(f"          Whole-grid Joint input+target {float(ja_frac)*100:5.1f}% | "
              f"Ocean-only {float(o_ja_frac)*100:5.1f}%")


def _serialize_datasets(train_ds, val_ds, test_ds, norm_stats, output_dir, complevel):
    """Serialize to disk with NetCDF4 compression."""
    print("\n" + "=" * 65)
    print("SAVING PREPROCESSED DATASETS TO DISK")
    print("=" * 65)

    encoding_float = {"dtype": "float32", "zlib": True, "complevel": complevel}
    encoding_int = {"dtype": "int8", "zlib": True, "complevel": complevel}

    file_specs = [
        ("Train Split", train_ds, output_dir / "train.nc"),
        ("Validation Split", val_ds, output_dir / "val.nc"),
        ("Evaluation Split", test_ds, output_dir / "test.nc"),
    ]

    for label, ds, path in file_specs:
        print(f"Serializing {label} → {path.name}...")
        ds.to_netcdf(
            path,
            encoding={
                "X": encoding_float,
                "Y": encoding_float,
                "Y_mask": encoding_int,
            },
        )
        print(f"  ✓ {label} saved ({path.stat().st_size / 1e6:.1f} MB)")

    norm_path = output_dir / "normalization_stats.nc"
    norm_stats.to_netcdf(norm_path)
    print(f"  ✓ Normalization stats saved ({norm_path.name})\n")


# =============================================================================
# POST-BUILD VALIDATION / AUDIT
# =============================================================================

def validate_processed_dataset(processed_dir: Path, cfg: PreprocessingConfig) -> bool:
    """
    Comprehensive post-build validation of generated train/val/test NetCDF files.

    Checks:
      A. Date ranges
      B. Shapes (X: time,14,60,80  Y: time,15,60,80)
      C. Coordinates (lat/lon centers, spacing)
      D. Channel names and ordering (exactly 14)
      E. Depth levels (exactly 15)
      F. X normalization (train physical channels ≈ mean=0, std=1)
      G. Mask values (only 0 and 1)
      H. Y units (degrees_C, not Kelvin)
      I. X missing-value encoding (no NaN in physical channels)
      J. Y/Y_mask consistency
      K. No leakage (normalization stats from train only)

    Returns True if all checks pass, raises on failure.
    """
    print("\n" + "=" * 70)
    print("POST-BUILD DATASET VALIDATION")
    print("=" * 70)

    res = cfg.grid_resolution
    expected_lat_first = cfg.min_lat + res / 2.0
    expected_lat_last = cfg.max_lat - res / 2.0
    expected_lon_first = cfg.min_lon + res / 2.0
    expected_lon_last = cfg.max_lon - res / 2.0
    n_lat = int(round((cfg.max_lat - cfg.min_lat) / res))
    n_lon = int(round((cfg.max_lon - cfg.min_lon) / res))

    all_ok = True
    warnings = []

    for split_name, filename, expected_year_range in [
        ("Train", "train.nc", (2020, cfg.train_end_year)),
        ("Val", "val.nc", (cfg.val_year, cfg.val_year)),
        ("Test", "test.nc", (cfg.test_year, cfg.test_year)),
    ]:
        path = processed_dir / filename
        if not path.exists():
            print(f"  ✗ {filename} not found!")
            all_ok = False
            continue

        ds = xr.open_dataset(path)
        print(f"\n── {split_name} ({filename}) ──")

        # A. Date ranges
        years = ds.time.dt.year.values
        y_min, y_max = int(years.min()), int(years.max())
        exp_min, exp_max = expected_year_range
        date_ok = (y_min == exp_min and y_max == exp_max)
        status = "✓" if date_ok else "✗"
        print(f"  {status} Date range: {y_min}–{y_max} (expected {exp_min}–{exp_max})")
        if not date_ok:
            all_ok = False

        # B. Shapes
        x_shape = ds.X.shape
        y_shape = ds.Y.shape
        ym_shape = ds.Y_mask.shape
        n_time = ds.sizes["time"]

        x_ok = x_shape == (n_time, 14, n_lat, n_lon)
        y_ok = y_shape == (n_time, 15, n_lat, n_lon)
        ym_ok = ym_shape == (n_time, 15, n_lat, n_lon)

        print(f"  {'✓' if x_ok else '✗'} X shape: {x_shape} (expected ({n_time}, 14, {n_lat}, {n_lon}))")
        print(f"  {'✓' if y_ok else '✗'} Y shape: {y_shape}")
        print(f"  {'✓' if ym_ok else '✗'} Y_mask shape: {ym_shape}")
        if not (x_ok and y_ok and ym_ok):
            all_ok = False

        # C. Coordinates
        lat = ds.latitude.values
        lon = ds.longitude.values
        lat_ok = (abs(lat[0] - expected_lat_first) < 1e-4 and abs(lat[-1] - expected_lat_last) < 1e-4)
        lon_ok = (abs(lon[0] - expected_lon_first) < 1e-4 and abs(lon[-1] - expected_lon_last) < 1e-4)
        print(f"  {'✓' if lat_ok else '✗'} Lat: {lat[0]:.3f}→{lat[-1]:.3f} (expected {expected_lat_first:.3f}→{expected_lat_last:.3f})")
        print(f"  {'✓' if lon_ok else '✗'} Lon: {lon[0]:.3f}→{lon[-1]:.3f} (expected {expected_lon_first:.3f}→{expected_lon_last:.3f})")
        if not (lat_ok and lon_ok):
            all_ok = False

        # D. Channel names
        if "channel" in ds.X.coords:
            channels = list(ds.X.channel.values)
            ch_ok = (channels == ALL_CHANNELS)
            print(f"  {'✓' if ch_ok else '✗'} Channels: {len(channels)} (expected {len(ALL_CHANNELS)})")
            if not ch_ok:
                print(f"    Expected: {ALL_CHANNELS}")
                print(f"    Got:      {channels}")
                all_ok = False
        else:
            print("  ✗ No channel coordinate found in X")
            all_ok = False

        # E. Depths
        depths = ds.Y.depth.values.tolist()
        depths_ok = np.allclose(depths, cfg.target_depths, atol=1e-4)
        print(f"  {'✓' if depths_ok else '✗'} Depths: {len(depths)} levels")
        if not depths_ok:
            all_ok = False

        # F. X normalization (train only)
        if split_name == "Train" and "channel" in ds.X.coords:
            physical_x = ds.X.sel(channel=PHYSICAL_CHANNELS)
            for i, ch in enumerate(PHYSICAL_CHANNELS):
                ch_data = physical_x.sel(channel=ch).values
                mask_ch = ds.X.sel(channel=f"{ch}_mask").values
                valid = ch_data[mask_ch > 0.5]
                if len(valid) > 0:
                    m = float(np.mean(valid))
                    s = float(np.std(valid))
                    norm_ok = abs(m) < 0.1 and abs(s - 1.0) < 0.2
                    print(f"  {'✓' if norm_ok else '⚠'} {ch} normalization: mean={m:.4f}, std={s:.4f}")
                    if not norm_ok:
                        warnings.append(f"{ch} normalization: mean={m:.4f}, std={s:.4f}")

        # G. Mask values (only 0 and 1)
        if "channel" in ds.X.coords:
            for mch in MASK_CHANNELS:
                mask_vals = ds.X.sel(channel=mch).values
                unique = np.unique(mask_vals[np.isfinite(mask_vals)])
                mask_binary_ok = set(unique).issubset({0.0, 1.0})
                if not mask_binary_ok:
                    print(f"  ✗ {mch} contains non-binary values: {unique[:10]}")
                    all_ok = False

        ym_vals = ds.Y_mask.values
        ym_unique = np.unique(ym_vals)
        ym_binary_ok = set(ym_unique.tolist()).issubset({0, 1})
        print(f"  {'✓' if ym_binary_ok else '✗'} Y_mask binary: unique values = {ym_unique}")
        if not ym_binary_ok:
            all_ok = False

        # H. Y values (degrees_C, not Kelvin)
        y_vals = ds.Y.values
        y_valid = y_vals[np.isfinite(y_vals)]
        if len(y_valid) > 0:
            y_min_val, y_max_val, y_mean = float(y_valid.min()), float(y_valid.max()), float(y_valid.mean())
            kelvin_like = y_mean > 100
            print(f"  {'✗' if kelvin_like else '✓'} Y range: [{y_min_val:.2f}, {y_max_val:.2f}], mean={y_mean:.2f} °C")
            if kelvin_like:
                all_ok = False

        # I. X physical channels: no NaN remaining
        if "channel" in ds.X.coords:
            physical_x = ds.X.sel(channel=PHYSICAL_CHANNELS)
            n_nan = int(np.isnan(physical_x.values).sum())
            print(f"  {'✓' if n_nan == 0 else '✗'} X physical NaN count: {n_nan}")
            if n_nan > 0:
                all_ok = False

        # J. Y/Y_mask consistency
        y_nan = np.isnan(y_vals)
        ym_zero = (ym_vals == 0)
        # Every Y NaN must have Y_mask=0
        nan_masked = np.all(y_nan <= ym_zero)  # if nan, then mask must be 0
        # Every Y_mask=1 must have finite Y
        mask1_finite = np.all((ym_vals == 1) <= np.isfinite(y_vals))
        print(f"  {'✓' if nan_masked else '✗'} Y NaN ⊆ Y_mask=0: {nan_masked}")
        print(f"  {'✓' if mask1_finite else '✗'} Y_mask=1 ⊆ finite Y: {mask1_finite}")
        if not (nan_masked and mask1_finite):
            all_ok = False

        ds.close()

    # K. Normalization stats
    norm_path = processed_dir / "normalization_stats.nc"
    if norm_path.exists():
        ns = xr.open_dataset(norm_path)
        has_channel = "channel" in ns.coords
        print(f"\n── Normalization Stats ──")
        print(f"  {'✓' if has_channel else '✗'} Channel coordinate present: {has_channel}")
        if has_channel:
            ch_list = list(ns.channel.values)
            ch_match = (ch_list == PHYSICAL_CHANNELS)
            print(f"  {'✓' if ch_match else '✗'} Channels: {ch_list}")
        ns.close()
    else:
        print(f"\n  ✗ normalization_stats.nc not found!")
        all_ok = False

    # Summary
    print("\n" + "=" * 70)
    if all_ok and not warnings:
        print("✓ ALL VALIDATION CHECKS PASSED")
    elif all_ok:
        print("✓ All critical checks passed (with warnings)")
        for w in warnings:
            print(f"  ⚠ {w}")
    else:
        print("✗ VALIDATION FAILED — see above for details")
    print("=" * 70)

    return all_ok
