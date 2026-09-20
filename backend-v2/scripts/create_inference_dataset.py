from pathlib import Path

import xarray as xr


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SOURCE = PROJECT_ROOT / "data" / "test.nc"
OUTPUT = PROJECT_ROOT / "data" / "inference_inputs.nc"
TEMP_OUTPUT = PROJECT_ROOT / "data" / "inference_inputs.nc.tmp"


def main():
    print("Reading source dataset:")
    print(f"  {SOURCE}")

    if not SOURCE.exists():
        raise FileNotFoundError(f"Source dataset not found: {SOURCE}")

    if TEMP_OUTPUT.exists():
        TEMP_OUTPUT.unlink()

    # ---------------------------------------------------------
    # Open the existing preprocessed dataset.
    # ---------------------------------------------------------
    ds = xr.open_dataset(SOURCE)

    print("\nOriginal dataset:")
    print(ds)

    # ---------------------------------------------------------
    # Keep ONLY the model input X and the coordinates required
    # by the runtime API.
    #
    # X itself only depends on:
    #   time, channel, latitude, longitude
    #
    # depth is retained as a standalone coordinate because the
    # CNN predicts 15 depth levels and the API needs those levels
    # when constructing the response.
    # ---------------------------------------------------------
    inference_ds = xr.Dataset(
        data_vars={
            "X": ds["X"],
        },
        coords={
            "time": ds["time"],
            "channel": ds["channel"],
            "latitude": ds["latitude"],
            "longitude": ds["longitude"],
            "depth": ds["depth"],
        },
        attrs=ds.attrs,
    )

    # ---------------------------------------------------------
    # Make sure X is float32.
    # ---------------------------------------------------------
    inference_ds["X"] = inference_ds["X"].astype("float32")

    # ---------------------------------------------------------
    # Validate dimensions.
    # ---------------------------------------------------------
    expected_dims = {
        "time": 365,
        "channel": 14,
        "latitude": 60,
        "longitude": 80,
        "depth": 15,
    }

    for dim, expected_size in expected_dims.items():
        actual_size = inference_ds.sizes.get(dim)

        if actual_size != expected_size:
            raise RuntimeError(
                f"Unexpected dimension {dim}: "
                f"expected {expected_size}, got {actual_size}"
            )

    # ---------------------------------------------------------
    # Validate X dimensions.
    # ---------------------------------------------------------
    expected_x_dims = (
        "time",
        "channel",
        "latitude",
        "longitude",
    )

    if inference_ds["X"].dims != expected_x_dims:
        raise RuntimeError(
            f"Unexpected X dimensions: {inference_ds['X'].dims}"
        )

    # ---------------------------------------------------------
    # Validate depth coordinate.
    # ---------------------------------------------------------
    expected_depths = [
        0,
        5,
        10,
        20,
        30,
        50,
        75,
        100,
        125,
        150,
        200,
        300,
        500,
        700,
        1000,
    ]

    actual_depths = inference_ds["depth"].values.tolist()

    if actual_depths != expected_depths:
        raise RuntimeError(
            f"Unexpected depth coordinate:\n"
            f"expected: {expected_depths}\n"
            f"got:      {actual_depths}"
        )

    # ---------------------------------------------------------
    # Critical: runtime inference requires finite X.
    # ---------------------------------------------------------
    if not bool(inference_ds["X"].notnull().all()):
        raise RuntimeError("X contains NaN values.")

    # ---------------------------------------------------------
    # Print final dataset before writing.
    # ---------------------------------------------------------
    print("\nInference dataset:")
    print(inference_ds)

    print("\nX shape:")
    print(inference_ds["X"].shape)

    print("\nDepth coordinate:")
    print(inference_ds["depth"].values)

    # ---------------------------------------------------------
    # NetCDF4 compression.
    # ---------------------------------------------------------
    encoding = {
        "X": {
            "zlib": True,
            "complevel": 5,
            "shuffle": True,
            "dtype": "float32",
            "chunksizes": (1, 14, 60, 80),
        }
    }

    print("\nWriting compressed inference dataset...")

    inference_ds.to_netcdf(
        TEMP_OUTPUT,
        engine="netcdf4",
        format="NETCDF4",
        encoding=encoding,
    )

    inference_ds.close()
    ds.close()

    # ---------------------------------------------------------
    # Atomically move temporary file to final destination.
    # ---------------------------------------------------------
    TEMP_OUTPUT.replace(OUTPUT)

    print("\nCreated:")
    print(f"  {OUTPUT}")

    print("\nDone.")


if __name__ == "__main__":
    main()