"""Dataset builder: chronological splitting, train-set normalization, 14-channel assembly, and NetCDF serialization."""

from pathlib import Path
from typing import Dict, Tuple
import dask
import numpy as np
import xarray as xr


INPUT_VARIABLES = ["SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V"]


def build_and_save_ml_datasets(
    surface_common: xr.Dataset,
    thetao_common: xr.DataArray,
    output_dir: Path,
    train_end_year: int = 2023,
    val_year: int = 2024,
    test_year: int = 2025,
) -> Tuple[xr.Dataset, xr.Dataset, xr.Dataset, xr.Dataset]:
    """
    Assemble the 14-channel model input, apply strict train-only normalization,
    partition chronologically, and save compressed NetCDF files.

    Args:
        surface_common: 0.25° aligned surface Dataset.
        thetao_common: 0.25° aligned 15-depth target DataArray.
        output_dir: Directory where train.nc, val.nc, test.nc, normalization_stats.nc will be written.
        train_end_year: Last year included in training split (inclusive).
        val_year: Year for validation split.
        test_year: Year for evaluation holdout split.

    Returns:
        Tuple of (train_ds, val_ds, test_ds, norm_stats_ds)
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    print("\nAligning surface inputs and subsurface target...")
    surface_common, thetao_common = xr.align(surface_common, thetao_common, join="exact")

    assert surface_common.sizes["time"] == thetao_common.sizes["time"], "Time mismatch between X and Y"
    assert surface_common.sizes["latitude"] == thetao_common.sizes["latitude"], "Latitude mismatch"
    assert surface_common.sizes["longitude"] == thetao_common.sizes["longitude"], "Longitude mismatch"

    # 1. Construct 7-channel raw feature tensor and observation masks
    X_da = xr.concat([surface_common[var] for var in INPUT_VARIABLES], dim="channel")
    X_da = X_da.assign_coords(channel=INPUT_VARIABLES)
    X_da.name = "surface_inputs"

    Y_da = thetao_common.rename("subsurface_temperature")

    X_mask = X_da.notnull()
    X_mask.name = "surface_observation_mask"

    Y_mask = Y_da.notnull()
    Y_mask.name = "target_valid_mask"

    X_da = X_da.transpose("time", "channel", "latitude", "longitude")
    X_mask = X_mask.transpose("time", "channel", "latitude", "longitude")
    Y_da = Y_da.transpose("time", "depth", "latitude", "longitude")
    Y_mask = Y_mask.transpose("time", "depth", "latitude", "longitude")

    print(f"X raw shape:      {X_da.shape} (dims: {X_da.dims})")
    print(f"Y target shape:   {Y_da.shape} (dims: {Y_da.dims})")

    # 2. Chronological Split (prevents future data leakage)
    print(f"\nPartitioning chronologically: Train (<= {train_end_year}), Val ({val_year}), Test ({test_year})...")
    train_mask = X_da.time.dt.year <= train_end_year
    val_mask = X_da.time.dt.year == val_year
    test_mask = X_da.time.dt.year == test_year

    X_train = X_da.sel(time=train_mask)
    X_val = X_da.sel(time=val_mask)
    X_test = X_da.sel(time=test_mask)

    Y_train = Y_da.sel(time=train_mask)
    Y_val = Y_da.sel(time=val_mask)
    Y_test = Y_da.sel(time=test_mask)

    Xmask_train = X_mask.sel(time=train_mask)
    Xmask_val = X_mask.sel(time=val_mask)
    Xmask_test = X_mask.sel(time=test_mask)

    Ymask_train = Y_mask.sel(time=train_mask)
    Ymask_val = Y_mask.sel(time=val_mask)
    Ymask_test = Y_mask.sel(time=test_mask)

    # 3. Compute Normalization Statistics SOLELY from Training Set
    print("Computing per-channel mean and std from training set (batched)...")
    train_mean_lazy = X_train.mean(dim=["time", "latitude", "longitude"], skipna=True)
    train_std_lazy = X_train.std(dim=["time", "latitude", "longitude"], skipna=True)

    train_mean, train_std = dask.compute(train_mean_lazy, train_std_lazy)

    print("Train means:", [f"{v:.3e}" for v in train_mean.values])
    print("Train stds: ", [f"{v:.3e}" for v in train_std.values])

    # 4. Standardize inputs and zero-fill missing observations
    print("Normalizing features and zero-filling missing observations...")
    X_train_norm = ((X_train - train_mean) / train_std).fillna(0.0)
    X_val_norm = ((X_val - train_mean) / train_std).fillna(0.0)
    X_test_norm = ((X_test - train_mean) / train_std).fillna(0.0)

    # 5. Assemble 14-channel input (7 normalized features + 7 observation masks)
    def assemble_14_channels(X_norm, Xmask):
        mask_channels = Xmask.astype(np.float32)
        mask_channels = mask_channels.assign_coords(
            channel=[f"{c}_mask" for c in X_norm.channel.values]
        )
        return xr.concat([X_norm, mask_channels], dim="channel")

    X_train_14 = assemble_14_channels(X_train_norm, Xmask_train)
    X_val_14 = assemble_14_channels(X_val_norm, Xmask_val)
    X_test_14 = assemble_14_channels(X_test_norm, Xmask_test)

    # 6. Wrap into Final Datasets
    train_ds = xr.Dataset({
        "X": X_train_14,
        "Y": Y_train,
        "Y_mask": Ymask_train.astype(np.int8),
    })

    val_ds = xr.Dataset({
        "X": X_val_14,
        "Y": Y_val,
        "Y_mask": Ymask_val.astype(np.int8),
    })

    test_ds = xr.Dataset({
        "X": X_test_14,
        "Y": Y_test,
        "Y_mask": Ymask_test.astype(np.int8),
    })

    norm_stats = xr.Dataset({
        "train_mean": train_mean,
        "train_std": train_std,
    })

    # Validate schema
    assert train_ds.X.dims == ("time", "channel", "latitude", "longitude")
    assert train_ds.Y.dims == ("time", "depth", "latitude", "longitude")
    assert train_ds.Y_mask.dims == ("time", "depth", "latitude", "longitude")
    print("\n✓ Schema and dimension assertions passed.")

    # 7. Serialize to Disk with NetCDF4 Compression
    print("\n" + "=" * 65)
    print("SAVING PREPROCESSED DATASETS TO DISK")
    print("=" * 65)

    encoding_float = {"dtype": "float32", "zlib": True, "complevel": 4}
    encoding_int = {"dtype": "int8", "zlib": True, "complevel": 4}

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

    return train_ds, val_ds, test_ds, norm_stats
