import xarray as xr

path = "data/test.nc"

print("=" * 70)
print("OPENING TEST DATASET")
print("=" * 70)

ds = xr.open_dataset(path)

print("\nDATASET")
print(ds)

print("\n" + "=" * 70)
print("DIMENSIONS")
print("=" * 70)

for name, size in ds.sizes.items():
    print(f"{name:20s}: {size}")


print("\n" + "=" * 70)
print("COORDINATES")
print("=" * 70)

for name, coord in ds.coords.items():
    print(
        f"{name:20s}: "
        f"dims={coord.dims}, "
        f"shape={coord.shape}, "
        f"dtype={coord.dtype}"
    )

    if coord.size <= 20:
        print("   values:", coord.values)


print("\n" + "=" * 70)
print("DATA VARIABLES")
print("=" * 70)

for name, variable in ds.data_vars.items():

    print(f"\n{name}")

    print("   dims :", variable.dims)
    print("   shape:", variable.shape)
    print("   dtype:", variable.dtype)

    print("   attrs:")

    for key, value in variable.attrs.items():
        print(f"      {key}: {value}")


print("\n" + "=" * 70)
print("GLOBAL ATTRIBUTES")
print("=" * 70)

for key, value in ds.attrs.items():
    print(f"{key}: {value}")


ds.close()