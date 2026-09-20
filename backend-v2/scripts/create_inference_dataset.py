from pathlib import Path
import xarray as xr


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SOURCE = PROJECT_ROOT / "data" / "test.nc"
OUTPUT = PROJECT_ROOT / "data" / "inference_inputs.nc"
TEMP_OUTPUT = PROJECT_ROOT / "data" / "inference_inputs.nc.tmp"


def main():
    print(f"Reading source dataset:")
    print(f"  {SOURCE}")

    if not SOURCE.exists():
        raise FileNotFoundError(f"Source dataset not found: {SOURCE}")

    if TEMP_OUTPUT.exists():
        TEMP_OUTPUT.unlink()

    # Open the existing preprocessed dataset.
    ds = xr.open_dataset(SOURCE)

    print("\nOriginal dataset:")
    print(ds)

    # Keep ONLY the model input.
    inference_ds = ds[["X"]].copy()

    # Make sure X is float32.
    inference_ds["X"] = inference_ds["X"].astype("float32")

    # Validate before writing.
    expected_dims = {
        "time": 365,
        "channel": 14,
        "latitude": 60,
        "longitude": 80,
    }

    for dim, expected_size in expected_dims.items():
        actual_size = inference_ds.sizes.get(dim)

        if actual_size != expected_size:
            raise RuntimeError(
                f"Unexpected dimension {dim}: "
                f"expected {expected_size}, got {actual_size}"
            )

    if not inference_ds["X"].dims == (
        "time",
        "channel",
        "latitude",
        "longitude",
    ):
        raise RuntimeError(
            f"Unexpected X dimensions: {inference_ds['X'].dims}"
        )

    # Critical: runtime inference requires finite X.
    if not bool(inference_ds["X"].notnull().all()):
        raise RuntimeError("X contains NaN values.")

    print("\nInference dataset:")
    print(inference_ds)

    # NetCDF4 compression.
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

    # Atomically move temporary file to final destination.
    TEMP_OUTPUT.replace(OUTPUT)

    print("\nCreated:")
    print(f"  {OUTPUT}")

    print("\nDone.")


if __name__ == "__main__":
    main()