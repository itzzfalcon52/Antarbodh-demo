from pathlib import Path
import xarray as xr


FILES = {
    "GLORYS": "data/raw/glorys/glorys_bob.nc",
    "SST": "data/raw/sst/sst_bob.nc",
    "SSS ascending": "data/raw/sss/sss_bob_ascending.nc",
    "SSS descending": "data/raw/sss/sss_bob_descending.nc",
    "SSH": "data/raw/ssh/ssh_bob.nc",
    "Currents": "data/raw/currents/currents_bob.nc",
    "Winds": "data/raw/winds/winds_bob.nc",
}


def inspect_dataset(name, path):
    print("\n" + "=" * 70)
    print(name)
    print("=" * 70)

    path = Path(path)

    if not path.exists():
        print(f"FILE NOT FOUND: {path}")
        return

    ds = xr.open_dataset(path)

    print("\nDimensions:")
    print(ds.dims)

    print("\nCoordinates:")
    for coord in ds.coords:
        values = ds[coord].values
        print(
            f"  {coord}: "
            f"size={ds[coord].size}, "
            f"first={values.flat[0]}, "
            f"last={values.flat[-1]}"
        )

    print("\nVariables:")
    for var in ds.data_vars:
        da = ds[var]

        print(
            f"  {var}: "
            f"dims={da.dims}, "
            f"shape={da.shape}, "
            f"dtype={da.dtype}"
        )

        if hasattr(da, "attrs"):
            units = da.attrs.get("units")
            standard_name = da.attrs.get("standard_name")

            if units:
                print(f"      units={units}")

            if standard_name:
                print(f"      standard_name={standard_name}")

    print("\nApproximate file size:")
    print(f"  {path.stat().st_size / 1024**2:.2f} MB")

    ds.close()


def main():
    for name, path in FILES.items():
        inspect_dataset(name, path)


if __name__ == "__main__":
    main()